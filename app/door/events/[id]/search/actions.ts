"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SearchHit {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  allocation_name: string | null;
  checked_in_at: string | null;
}

interface GuestHit {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  allocation: { holder_name: string } | null;
  check_ins: Array<{ scanned_at: string; state: string }>;
}

/**
 * Fuzzy search for guests on an event-night by name. Capped at 20 results.
 * Called from the search page as user types.
 */
export async function searchGuestsAction(
  nightId: string,
  query: string
): Promise<{ results: SearchHit[] }> {
  const q = query.trim();
  if (q.length < 1) return { results: [] };

  const admin = createAdminClient();

  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, tier, status, flag_dna, allocation:allocations(holder_name), check_ins(scanned_at, state)"
    )
    .eq("event_night_id", nightId)
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(20);

  const rows = (data ?? []) as unknown as GuestHit[];
  const results: SearchHit[] = rows.map((g) => {
    const approvedScan = g.check_ins.find((c) => c.state === "approved");
    return {
      id: g.id,
      full_name: g.full_name,
      plus_ones: g.plus_ones,
      tier: g.tier,
      status: g.status,
      flag_dna: g.flag_dna,
      allocation_name: g.allocation?.holder_name ?? null,
      checked_in_at: approvedScan?.scanned_at ?? null,
    };
  });

  return { results };
}

export type ManualScanResult =
  | { ok: true; scannedAt: string }
  | { ok: false; error: string; priorScanAt?: string };

/**
 * Manual check-in from the name-search flow. Enforces same rules as camera
 * scan: blocks pending/rejected, blocks dna-flagged guests, refuses duplicates.
 */
export async function manualCheckInAction(
  eventId: string,
  guestId: string
): Promise<ManualScanResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, status, flag_dna, flag_reason, event_night_id, night:event_nights!inner(event_id)"
    )
    .eq("id", guestId)
    .maybeSingle<{
      id: string;
      status: string;
      flag_dna: boolean;
      flag_reason: string | null;
      event_night_id: string;
      night: { event_id: string };
    }>();

  if (!guest) return { ok: false, error: "Guest not found." };
  if (guest.night.event_id !== eventId) {
    return { ok: false, error: "Guest is for a different event." };
  }
  if (guest.flag_dna) {
    await admin.from("check_ins").insert({
      guest_id: guest.id,
      event_night_id: guest.event_night_id,
      scanned_by: user.id,
      state: "do_not_admit",
    });
    return { ok: false, error: `DO NOT ADMIT${guest.flag_reason ? ` — ${guest.flag_reason}` : ""}` };
  }
  if (guest.status !== "approved") {
    return { ok: false, error: "Guest is not approved." };
  }

  const { data: prior } = await admin
    .from("check_ins")
    .select("scanned_at")
    .eq("guest_id", guest.id)
    .eq("state", "approved")
    .maybeSingle<{ scanned_at: string }>();
  if (prior) {
    return { ok: false, error: "Already checked in.", priorScanAt: prior.scanned_at };
  }

  const { error: insertErr } = await admin.from("check_ins").insert({
    guest_id: guest.id,
    event_night_id: guest.event_night_id,
    scanned_by: user.id,
    state: "approved",
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "door.manual_check_in",
    entity_type: "guest",
    entity_id: guest.id,
  });

  revalidatePath(`/door/events/${eventId}`);
  revalidatePath(`/manager/events/${eventId}`);

  return { ok: true, scannedAt: new Date().toISOString() };
}
