import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { nextOnboardingStep } from "@/lib/routing";
import type { Account, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose your role tonight — WADL" };

/**
 * Day 27 — dualctx context switcher.
 *
 * Same-person-two-roles edge case: an owner who is ALSO assigned as
 * door staff or door manager for tonight's event needs to pick which
 * surface they want at signin. Without this, the root router would
 * always pick the owner dashboard, and the founder-as-door-staff case
 * never gets the staff scanner.
 *
 * This route is reachable when:
 *   - The signed-in user has profile.role === "owner"
 *   - AND there's at least one event_staff row for an event_night
 *     happening today (doors_at within ±18 hours of now).
 *
 * Otherwise we redirect to the standard onboarding router.
 */

interface StaffShift {
  event_id: string;
  role: "door_staff" | "door_manager";
  event_name: string;
  doors_at: string;
  night_id: string;
  night_date: string;
}

export default async function DualCtxPage({
  searchParams,
}: {
  searchParams: { force?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) redirect("/signup");

  // Guests never hit this page.
  if (profile.role === "guest") redirect("/mytickets");

  const admin = createAdminClient();

  // Tonight ± 18h. Picks up afternoon load-in shifts and post-doors close-out.
  const now = Date.now();
  const start = new Date(now - 18 * 60 * 60 * 1000).toISOString();
  const end = new Date(now + 18 * 60 * 60 * 1000).toISOString();

  const { data: shiftRows } = await admin
    .from("event_staff")
    .select(
      "event_id, role, event:events!inner(id, name, event_nights!inner(id, night_date, doors_at))"
    )
    .eq("user_id", user.id)
    .in("role", ["door_staff", "door_manager"])
    .gte("event.event_nights.doors_at", start)
    .lte("event.event_nights.doors_at", end);

  type RawShift = {
    event_id: string;
    role: "door_staff" | "door_manager";
    event: {
      id: string;
      name: string;
      event_nights: Array<{ id: string; night_date: string; doors_at: string }>;
    };
  };

  const shifts: StaffShift[] = ((shiftRows ?? []) as unknown as RawShift[])
    .flatMap((r) =>
      r.event.event_nights.map((n) => ({
        event_id: r.event_id,
        role: r.role,
        event_name: r.event.name,
        doors_at: n.doors_at,
        night_id: n.id,
        night_date: n.night_date,
      }))
    )
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  // No shifts tonight + not forced → onboarding router.
  if (shifts.length === 0 && !searchParams.force) {
    let account: Account | null = null;
    if (profile.account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", profile.account_id)
        .maybeSingle<Account>();
      account = data;
    }
    let hasVenue = false;
    if (account?.account_type === "venue") {
      const { count } = await supabase
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);
      hasVenue = (count ?? 0) > 0;
    }
    redirect(nextOnboardingStep(profile, account, hasVenue));
  }

  const isOwner = profile.role === "owner" || !!profile.account_id;
  const primaryShift = shifts[0];

  return (
    <main id="main-content" className="mobile-frame">
      <header className="pt-12 pb-8">
        <p className="label-mono mb-2">Tonight</p>
        <h1 className="display-lg leading-[0.95]">
          Where are you working?
        </h1>
        <p className="text-muted text-sm mt-3">
          You&apos;re booked as both an owner and door staff. Pick the surface
          you want now — you can switch any time.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {isOwner && (
          <Link
            href="/owner"
            className="card hover:border-coral/60 transition group"
          >
            <p className="label-mono mb-1 text-coral">Owner</p>
            <p className="font-display text-2xl text-cream uppercase tracking-wide leading-tight">
              Run the show
            </p>
            <p className="text-muted text-sm mt-2">
              Approvals, allocations, capacity, analytics. Full access.
            </p>
          </Link>
        )}

        {primaryShift && (
          <Link
            href={
              primaryShift.role === "door_manager" ? "/manager" : "/door"
            }
            className="card hover:border-mint/60 transition"
          >
            <p className="label-mono mb-1 text-mint">
              {primaryShift.role === "door_manager"
                ? "Door manager"
                : "Door staff"}
            </p>
            <p className="font-display text-2xl text-cream uppercase tracking-wide leading-tight">
              Work the door
            </p>
            <p className="text-muted text-sm mt-2">
              {primaryShift.event_name} · {fmtDate(primaryShift.night_date)} ·
              doors {fmtTime(primaryShift.doors_at)}
            </p>
            {shifts.length > 1 && (
              <p className="label-mono mt-2 text-mint">
                + {shifts.length - 1} more shift{shifts.length === 2 ? "" : "s"} tonight
              </p>
            )}
          </Link>
        )}

        <Link
          href="/mytickets"
          className="card hover:border-lav/60 transition"
        >
          <p className="label-mono mb-1 text-lav">Guest</p>
          <p className="font-display text-2xl text-cream uppercase tracking-wide leading-tight">
            My tickets
          </p>
          <p className="text-muted text-sm mt-2">
            View your own RSVPs and QRs.
          </p>
        </Link>
      </div>

      <p className="label-mono mt-8 text-center">
        Pick once · switch via the sidebar later
      </p>
    </main>
  );
}
