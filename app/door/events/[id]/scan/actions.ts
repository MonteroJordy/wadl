"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ScanResult =
  | {
      state: "approved";
      guest: { id: string; full_name: string; plus_ones: number; tier: string };
    }
  | {
      state: "already_used";
      guest: { id: string; full_name: string; plus_ones: number; tier: string };
      scannedAt: string;
      scannedByName: string | null;
    }
  | { state: "not_found" }
  | {
      state: "wrong_event";
      actualEventName: string;
    }
  | {
      state: "wrong_night";
      actualNightDate: string;
    }
  | {
      state: "do_not_admit";
      guest: { id: string; full_name: string; plus_ones: number; tier: string };
      reason: string | null;
    }
  | { state: "error"; error: string };

interface GuestLookup {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  event_night_id: string;
  flag_dna: boolean;
  flag_reason: string | null;
  night: {
    id: string;
    night_date: string;
    event: { id: string; name: string };
  };
}

/**
 * Validate a QR token at the door. Called by the scanner client after every
 * decode. Deduplication / debounce is a client-side concern.
 */
export async function scanTokenAction(
  eventId: string,
  nightId: string,
  token: string
): Promise<ScanResult> {
  if (!token) return { state: "not_found" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "error", error: "Session expired." };

  const admin = createAdminClient();

  // Lookup guest by check_in_token.
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, tier, status, event_night_id, flag_dna, flag_reason, night:event_nights!inner(id, night_date, event:events!inner(id, name))"
    )
    .eq("check_in_token", token)
    .maybeSingle<GuestLookup>();

  if (!guest) return { state: "not_found" };

  // Wrong event — QR is for a completely different event.
  if (guest.night.event.id !== eventId) {
    return { state: "wrong_event", actualEventName: guest.night.event.name };
  }

  // Wrong night — same event, different night.
  if (guest.event_night_id !== nightId) {
    return { state: "wrong_night", actualNightDate: guest.night.night_date };
  }

  const guestPayload = {
    id: guest.id,
    full_name: guest.full_name,
    plus_ones: guest.plus_ones,
    tier: guest.tier,
  };

  // DNA flag — record the attempt, block entry.
  if (guest.flag_dna) {
    await admin.from("check_ins").insert({
      guest_id: guest.id,
      event_night_id: guest.event_night_id,
      scanned_by: user.id,
      state: "do_not_admit",
    });
    await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "door.blocked_dna",
      entity_type: "guest",
      entity_id: guest.id,
      context: { reason: guest.flag_reason },
    });
    return {
      state: "do_not_admit",
      guest: guestPayload,
      reason: guest.flag_reason,
    };
  }

  // Pending / rejected / cancelled — treat as not on list for door purposes.
  if (guest.status !== "approved") {
    return { state: "not_found" };
  }

  // Already used?
  const { data: prior } = await admin
    .from("check_ins")
    .select(
      "scanned_at, scanned_by, scanner:profiles(full_name)"
    )
    .eq("guest_id", guest.id)
    .eq("state", "approved")
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      scanned_at: string;
      scanned_by: string | null;
      scanner: { full_name: string | null } | null;
    }>();

  if (prior) {
    return {
      state: "already_used",
      guest: guestPayload,
      scannedAt: prior.scanned_at,
      scannedByName: prior.scanner?.full_name ?? null,
    };
  }

  // All clear — log and admit.
  const { error: insertErr } = await admin.from("check_ins").insert({
    guest_id: guest.id,
    event_night_id: guest.event_night_id,
    scanned_by: user.id,
    state: "approved",
  });
  if (insertErr) return { state: "error", error: insertErr.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "door.scanned_in",
    entity_type: "guest",
    entity_id: guest.id,
  });

  revalidatePath(`/door/events/${eventId}`);
  revalidatePath(`/manager/events/${eventId}`);

  return { state: "approved", guest: guestPayload };
}
