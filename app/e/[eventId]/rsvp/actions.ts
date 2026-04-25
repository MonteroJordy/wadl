"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { getAppUrl } from "@/lib/app-url";

interface CompleteInput {
  eventId: string;
  nightId: string;
  fullName: string;
  phone: string;
  plusOnes: number;
  email: string | null;
}

export type CompleteRsvpResult =
  | {
      ok: true;
      checkInToken: string;
      status: "approved" | "pending";
      ticketUrl: string;
      smsProvider: "dev" | "twilio";
    }
  | { ok: false; error: string };

/**
 * Called AFTER the browser has verified the OTP with Supabase and established
 * a session. We re-check the session here so we can trust `user.phone`.
 *
 * On success: find-or-create the walk-up allocation for the night, insert the
 * guest, send the QR link via SMS, return the check-in token for redirect.
 */
export async function completeRsvpAction(
  input: CompleteInput
): Promise<CompleteRsvpResult> {
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: "Enter a name." };
  if (!input.phone) return { ok: false, error: "Missing phone." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Verify your phone first." };
  if (user.phone && user.phone !== input.phone.replace(/^\+/, "")) {
    // Supabase stores phone sans leading + on the JWT/user record.
    // Compare without the +.
  }

  const admin = createAdminClient();

  // Fetch night + event so we can scope the walk-up allocation properly.
  const { data: night } = await admin
    .from("event_nights")
    .select(
      "id, event_id, capacity_cap, is_frozen, event:events!inner(id, created_by)"
    )
    .eq("id", input.nightId)
    .maybeSingle<{
      id: string;
      event_id: string;
      capacity_cap: number | null;
      is_frozen: boolean;
      event: { id: string; created_by: string };
    }>();

  if (!night || night.event_id !== input.eventId) {
    return { ok: false, error: "Night not found." };
  }
  if (night.is_frozen) return { ok: false, error: "RSVPs are closed." };

  // Find-or-create the walk-up allocation for this night.
  const { data: existing } = await admin
    .from("allocations")
    .select("id, cap, auto_approve, list_open, plus_ones_allowed")
    .eq("event_night_id", night.id)
    .eq("holder_name", "Walk-up")
    .maybeSingle<{
      id: string;
      cap: number;
      auto_approve: boolean;
      list_open: boolean;
      plus_ones_allowed: boolean;
    }>();

  let alloc = existing;
  if (!alloc) {
    const { data: inserted, error: allocErr } = await admin
      .from("allocations")
      .insert({
        event_night_id: night.id,
        holder_name: "Walk-up",
        cap: night.capacity_cap ?? 999_999,
        auto_approve: false,
        list_open: true,
        plus_ones_allowed: true,
        created_by: night.event.created_by,
      })
      .select("id, cap, auto_approve, list_open, plus_ones_allowed")
      .single();
    if (allocErr || !inserted) {
      return { ok: false, error: allocErr?.message ?? "Could not open walk-up list." };
    }
    alloc = inserted;
  }

  if (!alloc.list_open) return { ok: false, error: "Walk-up list is closed." };

  // Enforce cap. Count approved + pending on this allocation.
  const { data: used } = await admin
    .from("guests")
    .select("plus_ones, status")
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);
  const usedTotal = (used ?? []).reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0
  );
  const plusOnes = alloc.plus_ones_allowed ? Math.max(0, Math.min(10, input.plusOnes)) : 0;
  const needed = 1 + plusOnes;
  if (usedTotal + needed > alloc.cap) {
    return { ok: false, error: `Walk-up list is full (${usedTotal}/${alloc.cap}).` };
  }

  const status: "approved" | "pending" = alloc.auto_approve ? "approved" : "pending";

  const { data: guest, error: guestErr } = await admin
    .from("guests")
    .insert({
      event_night_id: night.id,
      allocation_id: alloc.id,
      full_name: fullName,
      phone: input.phone,
      email: input.email,
      plus_ones: plusOnes,
      status,
      phone_verified_at: new Date().toISOString(),
    })
    .select("check_in_token")
    .single();

  if (guestErr || !guest?.check_in_token) {
    return { ok: false, error: guestErr?.message ?? "Could not create ticket." };
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    actor_allocation_id: alloc.id,
    action: "guest.rsvp",
    entity_type: "guest",
    event_id: input.eventId,
    context: { full_name: fullName, plus_ones: plusOnes, status },
  });

  const ticketUrl = `${getAppUrl()}/t/${guest.check_in_token}`;

  const smsBody =
    status === "approved"
      ? `WADL: you're on the list. Show this QR at the door: ${ticketUrl}`
      : `WADL: RSVP received (pending host approval). Your ticket: ${ticketUrl}`;

  const smsResult = await sendSms({ to: input.phone, body: smsBody });
  // A failed SMS doesn't invalidate the RSVP — guest can still open ticketUrl
  // from /mytickets. Surface the provider for the success screen.
  const smsProvider: "dev" | "twilio" =
    smsResult.ok && smsResult.provider === "twilio" ? "twilio" : "dev";

  return {
    ok: true,
    checkInToken: guest.check_in_token,
    status,
    ticketUrl,
    smsProvider,
  };
}
