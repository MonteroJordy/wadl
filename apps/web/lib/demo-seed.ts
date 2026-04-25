"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Casey", "Riley", "Morgan", "Taylor", "Avery",
  "Quinn", "Hayden", "Skyler", "Reese", "Drew", "Cameron", "Bailey", "Dakota",
  "Emerson", "Finley", "Hunter", "Kendall", "Logan", "Parker", "Robin", "Sage",
  "River",
];
const LAST_NAMES = [
  "Reyes", "Singh", "Park", "Lopez", "Khan", "Chen", "Patel", "Nguyen",
  "Davis", "Lee", "Garcia", "Smith", "Rivera", "Cohen", "Cruz", "Diaz",
  "Brown", "Jones", "Wright", "Carter", "Bennett", "Hall", "Hayes", "Foster",
  "Bryant",
];

const TIERS: Array<"ga" | "vip" | "all_access"> = [
  "ga", "ga", "ga", "ga", "ga", "ga", "vip", "vip", "vip", "all_access",
];

const STATUSES: Array<"approved" | "pending" | "waitlisted"> = [
  "approved", "approved", "approved", "approved", "approved", "approved",
  "approved", "approved", "approved", "approved", "approved", "approved",
  "approved", "approved", "approved", "approved", "approved", "approved",
  "pending", "pending", "pending", "pending", "waitlisted",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genName(used: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  // Fallback ensures we don't loop forever.
  return `Guest ${used.size + 1}`;
}

export async function seedDemoDataAction(): Promise<
  | { ok: true; venueId: string; eventId: string }
  | { ok: false; error: string }
> {
  const { account, profile } = await requireOwnerContext();
  if (profile.demo_seeded_at) {
    return { ok: false, error: "Demo data already seeded for this account." };
  }

  const admin = createAdminClient();

  // 1. Venue.
  const { data: venue, error: vErr } = await admin
    .from("venues")
    .insert({
      account_id: account.id,
      name: "The Patio (demo)",
      address: "100 Demo St",
      city: "Miami",
      timezone: "America/New_York",
      default_capacity: 200,
    })
    .select("id")
    .single();
  if (vErr || !venue) return { ok: false, error: vErr?.message ?? "Venue insert failed." };

  // 2. Event.
  const { data: event, error: eErr } = await admin
    .from("events")
    .insert({
      account_id: account.id,
      venue_id: venue.id,
      event_type: "venue_owned",
      name: "Demo Friday — Sample Night",
      description: "Demo event seeded by WADL onboarding.",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (eErr || !event) return { ok: false, error: eErr?.message ?? "Event insert failed." };

  // 3. Two nights — Fri / Sat upcoming.
  const now = new Date();
  const friday = new Date(now);
  friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7 || 7));
  friday.setHours(23, 0, 0, 0);
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const nightsToInsert = [friday, saturday].map((d) => ({
    event_id: event.id,
    night_date: d.toISOString().slice(0, 10),
    doors_at: d.toISOString(),
    cutoff_at: new Date(d.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    capacity_cap: 100,
  }));
  const { data: nights, error: nErr } = await admin
    .from("event_nights")
    .insert(nightsToInsert)
    .select("id, doors_at");
  if (nErr || !nights) return { ok: false, error: nErr?.message ?? "Nights insert failed." };

  // 4. Allocations on the FIRST night.
  const firstNight = nights[0];
  const allocsToInsert = [
    { event_night_id: firstNight.id, holder_name: "Diplo", cap: 25, auto_approve: true, list_open: true, plus_ones_allowed: true, created_by: profile.id },
    { event_night_id: firstNight.id, holder_name: "Marco Loco", cap: 25, auto_approve: false, list_open: true, plus_ones_allowed: true, created_by: profile.id },
    { event_night_id: firstNight.id, holder_name: "Walk-up", cap: 50, auto_approve: true, list_open: true, plus_ones_allowed: false, created_by: profile.id },
  ];
  const { data: allocs, error: aErr } = await admin
    .from("allocations")
    .insert(allocsToInsert)
    .select("id, holder_name");
  if (aErr || !allocs) return { ok: false, error: aErr?.message ?? "Alloc insert failed." };

  // 5. 25 guests sprinkled across allocations w/ mixed statuses.
  const used = new Set<string>();
  const guestRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 25; i++) {
    const alloc = allocs[i % allocs.length];
    const status = pick(STATUSES);
    guestRows.push({
      event_night_id: firstNight.id,
      allocation_id: alloc.id,
      full_name: genName(used),
      tier: pick(TIERS),
      plus_ones: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
      status,
      added_by_user_id: profile.id,
    });
  }
  const { data: guests, error: gErr } = await admin
    .from("guests")
    .insert(guestRows)
    .select("id, status, check_in_token");
  if (gErr || !guests) return { ok: false, error: gErr?.message ?? "Guest insert failed." };

  // 6. Scan ~half of approved guests in.
  const approved = guests.filter((g) => g.status === "approved");
  const toScan = approved.slice(0, Math.floor(approved.length / 2));
  if (toScan.length > 0) {
    const checkIns = toScan.map((g) => ({
      guest_id: g.id,
      event_night_id: firstNight.id,
      scanned_by: profile.id,
      state: "approved" as const,
      scanned_at: new Date(
        Date.now() - Math.random() * 60 * 60 * 1000
      ).toISOString(),
    }));
    await admin.from("check_ins").insert(checkIns);
  }

  await admin
    .from("profiles")
    .update({ demo_seeded_at: new Date().toISOString() })
    .eq("id", profile.id);

  revalidatePath("/owner");
  return { ok: true, venueId: venue.id, eventId: event.id };
}
