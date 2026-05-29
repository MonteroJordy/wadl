"use server";

import { revalidatePath } from "next/cache";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";

const TIER_MAP: Record<string, "ga" | "vip" | "all_access"> = {
  GA: "ga",
  VIP: "vip",
  AAA: "all_access",
};

export type WalkInResult =
  | { ok: true; guestId: string }
  | { ok: false; error: string };

/**
 * Add a walk-in guest at the door and immediately check them in for the
 * active night. Inserts a `guests` row (status approved), a `check_ins` row
 * (state approved), and an audit_log entry. Scoped via requireDoorContext —
 * the staffer must have door access to this event.
 */
export async function addWalkInAction(
  eventId: string,
  input: {
    name: string;
    phone?: string;
    tier: string;
    cover: string;
    nightId?: string;
  },
): Promise<WalkInResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const { admin, user, resolved } = await requireDoorContext({ eventId });
  if (!resolved) return { ok: false, error: "No door access for this event." };

  const { active } = await resolveActiveNight(admin, eventId, input.nightId);
  if (!active) return { ok: false, error: "No active night for this event." };

  const tier = TIER_MAP[input.tier] ?? "ga";

  const { data: guest, error: guestErr } = await admin
    .from("guests")
    .insert({
      event_night_id: active.id,
      full_name: name,
      phone: input.phone?.trim() || null,
      tier,
      status: "approved",
      plus_ones: 0,
      added_by_user_id: user.id,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (guestErr || !guest) {
    return { ok: false, error: guestErr?.message ?? "Could not add guest." };
  }

  const { error: checkInErr } = await admin.from("check_ins").insert({
    guest_id: guest.id,
    event_night_id: active.id,
    scanned_by: user.id,
    state: "approved",
  });
  if (checkInErr) return { ok: false, error: checkInErr.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "door.walk_in_added",
    entity_type: "guest",
    entity_id: guest.id,
    event_id: eventId,
    context: { tier, cover: input.cover, night_id: active.id },
  });

  revalidatePath(`/door/events/${eventId}`);
  revalidatePath(`/manager/events/${eventId}`);

  return { ok: true, guestId: guest.id };
}
