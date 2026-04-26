"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

const FIRSTS = [
  "Alex","Jordan","Sam","Casey","Riley","Morgan","Taylor","Avery","Quinn",
  "Hayden","Skyler","Reese","Drew","Cameron","Bailey","Dakota","Emerson",
  "Finley","Hunter","Kendall","Logan","Parker","Robin","Sage","River",
  "Phoenix","Indigo","Marlowe","Sloane","Wren","Sutton","Ellis","Tatum",
  "Carter","Rowan","Lennon","August","Halle","Maren","Ash","Devon","Blake",
];
const LASTS = [
  "Reyes","Singh","Park","Lopez","Khan","Chen","Patel","Nguyen","Davis",
  "Lee","Garcia","Smith","Rivera","Cohen","Cruz","Diaz","Brown","Jones",
  "Wright","Carter","Bennett","Hall","Hayes","Foster","Bryant","Vaughn",
  "Holloway","Bishop","Russo","Bowen","Ng","Mehra","Achebe","Olsen","Ito",
];
const TIERS: Array<"ga" | "vip" | "all_access"> = [
  "ga","ga","ga","ga","ga","ga","ga","vip","vip","vip","all_access",
];

// Distribution: most approved, some pending, a few waitlisted.
const STATUS_BUCKET: Array<"approved" | "pending" | "waitlisted"> = [
  "approved","approved","approved","approved","approved","approved",
  "approved","approved","approved","approved","approved","approved",
  "approved","approved","approved","approved","approved",
  "pending","pending","pending","pending","waitlisted",
];

const PLUS_ONE_BUCKET = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 0, 0, 0]; // ~21% with +1, ~7% with +2

// DRYRUN-prefixed phones — all start with +1555 to avoid colliding with real
// guest phones, easy to identify in the SMS log.
function pickPhone(idx: number): string {
  return `+1555${String(900_0000 + idx).padStart(7, "0")}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SeedInput {
  eventId: string;
  /** How many guests to seed. Capped at 200. */
  count: number;
  /** When true, also insert ~80% scanned check_ins to simulate a populated door. */
  simulateScans: boolean;
}

export async function seedDryRunAction(
  input: SeedInput
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const count = Math.max(1, Math.min(200, Math.floor(input.count)));

  // 1. Verify event ownership.
  const { data: event } = await admin
    .from("events")
    .select(
      "id, account_id, event_nights(id, doors_at, capacity_cap), allocations:event_nights(allocations(id, holder_name))"
    )
    .eq("id", input.eventId)
    .maybeSingle<{
      id: string;
      account_id: string;
      event_nights: Array<{ id: string; doors_at: string; capacity_cap: number | null }>;
    }>();
  if (!event || event.account_id !== account.id) {
    return { ok: false, error: "Not your event." };
  }
  if (event.event_nights.length === 0) {
    return { ok: false, error: "Event has no nights — add at least one in settings." };
  }

  // Pull allocations for distribution.
  const { data: allocRows } = await admin
    .from("allocations")
    .select("id, event_night_id")
    .in(
      "event_night_id",
      event.event_nights.map((n) => n.id)
    );
  const allocsByNight = new Map<string, string[]>();
  for (const a of (allocRows ?? []) as Array<{
    id: string;
    event_night_id: string;
  }>) {
    if (!allocsByNight.has(a.event_night_id)) allocsByNight.set(a.event_night_id, []);
    allocsByNight.get(a.event_night_id)!.push(a.id);
  }

  // 2. Build + insert guests.
  type GuestInsert = {
    event_night_id: string;
    full_name: string;
    phone: string;
    plus_ones: number;
    status: "approved" | "pending" | "waitlisted";
    tier: "ga" | "vip" | "all_access";
    allocation_id: string | null;
    check_in_token: string;
    notes: string;
  };
  const usedNames = new Set<string>();
  const guests: GuestInsert[] = [];
  for (let i = 0; i < count; i++) {
    const night = pick(event.event_nights);
    const allocs = allocsByNight.get(night.id) ?? [];
    let name = `${pick(FIRSTS)} ${pick(LASTS)}`;
    let attempts = 0;
    while (usedNames.has(name) && attempts < 30) {
      name = `${pick(FIRSTS)} ${pick(LASTS)}`;
      attempts++;
    }
    usedNames.add(name);
    const token = `dryrun_${crypto.randomUUID().replace(/-/g, "")}`;
    guests.push({
      event_night_id: night.id,
      full_name: name,
      phone: pickPhone(i),
      plus_ones: pick(PLUS_ONE_BUCKET),
      status: pick(STATUS_BUCKET),
      tier: pick(TIERS),
      allocation_id: allocs.length > 0 ? pick(allocs) : null,
      check_in_token: token,
      notes: "DRYRUN",
    });
  }

  const { data: insertedGuests, error: gErr } = await admin
    .from("guests")
    .insert(guests)
    .select("id, status, event_night_id, plus_ones");
  if (gErr) return { ok: false, error: gErr.message };

  // 3. Optionally insert check_ins for ~80% of approved guests, jittered
  // across the 2 hours after doors_at.
  let scansInserted = 0;
  if (input.simulateScans) {
    const checkIns: Array<{
      guest_id: string;
      event_night_id: string;
      state: "approved";
      scanned_at: string;
    }> = [];
    const nightDoors = new Map<string, number>();
    for (const n of event.event_nights) {
      nightDoors.set(n.id, new Date(n.doors_at).getTime());
    }
    for (const g of (insertedGuests ?? []) as Array<{
      id: string;
      status: string;
      event_night_id: string;
    }>) {
      if (g.status !== "approved") continue;
      if (Math.random() > 0.82) continue;
      const doors = nightDoors.get(g.event_night_id) ?? Date.now();
      // Bell-curve-ish: most arrive 30-90 min after doors, tail to 150 min.
      const minutesAfter = Math.round(30 + Math.random() * 90 + Math.random() * 30);
      const scanTime = new Date(doors + minutesAfter * 60 * 1000);
      checkIns.push({
        guest_id: g.id,
        event_night_id: g.event_night_id,
        state: "approved",
        scanned_at: scanTime.toISOString(),
      });
    }
    if (checkIns.length > 0) {
      const { error: cErr } = await admin.from("check_ins").insert(checkIns);
      if (!cErr) scansInserted = checkIns.length;
    }
  }

  await admin.from("audit_log").insert({
    action: "event.dryrun.seeded",
    entity_type: "event",
    entity_id: input.eventId,
    context: { count, scans: scansInserted, simulate: input.simulateScans },
  });

  revalidatePath(`/owner/events/${input.eventId}`);
  revalidatePath(`/owner/events/${input.eventId}/dryrun`);
  return { ok: true, created: guests.length };
}

export async function clearDryRunAction(
  eventId: string
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, account_id, event_nights(id)")
    .eq("id", eventId)
    .maybeSingle<{ id: string; account_id: string; event_nights: Array<{ id: string }> }>();
  if (!event || event.account_id !== account.id) {
    return { ok: false, error: "Not your event." };
  }
  const nightIds = event.event_nights.map((n) => n.id);
  if (nightIds.length === 0) return { ok: true, deleted: 0 };

  // Delete all guests with notes='DRYRUN' on this event's nights.
  // check_ins cascade via guest_id → guests.id ON DELETE CASCADE.
  const { data: deleted, error } = await admin
    .from("guests")
    .delete()
    .eq("notes", "DRYRUN")
    .in("event_night_id", nightIds)
    .select("id");
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    action: "event.dryrun.cleared",
    entity_type: "event",
    entity_id: eventId,
    context: { deleted: deleted?.length ?? 0 },
  });

  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath(`/owner/events/${eventId}/dryrun`);
  return { ok: true, deleted: deleted?.length ?? 0 };
}
