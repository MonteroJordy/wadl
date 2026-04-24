import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type DoorRole = "door_staff" | "door_manager";

interface StaffAssignment {
  event_id: string;
  role: DoorRole;
  event: { id: string; name: string };
}

/**
 * Guard for /door/* and /manager/* pages. Verifies the signed-in user has
 * an event_staff row (optionally for a specific event + required role).
 *
 * Owners of an event can access door/manager for that event even without
 * an event_staff row — this lets the founder test the flow end-to-end on a
 * single account. We still prefer explicit event_staff rows for real staff.
 */
export async function requireDoorContext(opts: {
  eventId?: string;
  requireRole?: DoorRole; // if omitted, both roles allowed
  fallback?: string;      // redirect target on missing access (default /)
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const fallback = opts.fallback ?? "/";

  // Staff assignments.
  const { data: staffData } = await admin
    .from("event_staff")
    .select("event_id, role, event:events!inner(id, name)")
    .eq("user_id", user.id)
    .in("role", ["door_staff", "door_manager"]);
  const staff = ((staffData ?? []) as unknown as StaffAssignment[]).slice();

  // Owner self-bypass: events on accounts this user owns.
  const { data: ownedEvents } = await admin
    .from("events")
    .select("id, name, account:accounts!inner(owner_user_id)")
    .eq("account.owner_user_id", user.id);
  for (const e of (ownedEvents ?? []) as unknown as Array<{
    id: string;
    name: string;
  }>) {
    if (!staff.find((s) => s.event_id === e.id)) {
      staff.push({
        event_id: e.id,
        role: "door_manager",
        event: { id: e.id, name: e.name },
      });
    }
  }

  if (staff.length === 0) redirect(fallback);

  let resolved: StaffAssignment | undefined;
  if (opts.eventId) {
    resolved = staff.find((s) => s.event_id === opts.eventId);
    if (!resolved) redirect(fallback);
    if (opts.requireRole === "door_manager" && resolved.role !== "door_manager") {
      redirect(fallback);
    }
  }

  return { supabase, admin, user, staff, resolved };
}

/**
 * For /door-home and /manager-home — pick an event to redirect to.
 * Prefers the event whose next night is closest to now.
 */
export async function pickActiveEvent(
  admin: ReturnType<typeof createAdminClient>,
  assignments: StaffAssignment[]
) {
  if (assignments.length === 0) return null;
  const eventIds = assignments.map((a) => a.event_id);
  const { data: nights } = await admin
    .from("event_nights")
    .select("event_id, doors_at")
    .in("event_id", eventIds)
    .order("doors_at", { ascending: true });
  const now = Date.now();
  for (const n of nights ?? []) {
    if (new Date(n.doors_at as string).getTime() >= now - 4 * 60 * 60_000) {
      return assignments.find((a) => a.event_id === n.event_id) ?? assignments[0];
    }
  }
  return assignments[0];
}

/**
 * Resolve the active night for a door session: query param → next upcoming →
 * first.
 */
export async function resolveActiveNight(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  preferNightId?: string
) {
  const { data: nightsData } = await admin
    .from("event_nights")
    .select("id, event_id, night_date, doors_at, capacity_cap, is_frozen")
    .eq("event_id", eventId)
    .order("doors_at", { ascending: true });
  const nights = (nightsData ?? []) as Array<{
    id: string;
    event_id: string;
    night_date: string;
    doors_at: string;
    capacity_cap: number | null;
    is_frozen: boolean;
  }>;

  if (nights.length === 0) return { nights, active: null };
  if (preferNightId) {
    const match = nights.find((n) => n.id === preferNightId);
    if (match) return { nights, active: match };
  }
  const now = Date.now();
  const upcoming = nights.find((n) => new Date(n.doors_at).getTime() >= now - 4 * 60 * 60_000);
  return { nights, active: upcoming ?? nights[0] };
}
