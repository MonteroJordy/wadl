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
  smsConsent: boolean;
  // Day 50 wedge — when present, attach to the named holder allocation
  // at the named tier instead of falling into the Walk-up bucket.
  tier?: "ga" | "vip" | "aaa" | null;
  allocationId?: string | null;
  subToken?: string | null;
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
  if (!input.smsConsent) {
    return {
      ok: false,
      error: "SMS consent is required to deliver your QR ticket.",
    };
  }

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

  // ─── Pick the allocation ──────────────────────────────────────────
  // Day 50: if a sub_token is present, validate it and use the holder's
  // allocation instead of the Walk-up bucket. The per-tier cap is
  // enforced separately below.
  let alloc: {
    id: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  } | null = null;
  let subTokenTier: { id: string; cap: number; tier: string } | null = null;

  if (input.subToken) {
    const { data: tierRow } = await admin
      .from("allocation_tier_caps")
      .select(
        "id, tier, cap, sub_token, revoked_at, " +
          "allocation:allocations!inner(id, event_night_id, holder_name, cap, auto_approve, list_open, plus_ones_allowed)",
      )
      .eq("sub_token", input.subToken)
      .maybeSingle<{
        id: string;
        tier: string;
        cap: number;
        revoked_at: string | null;
        allocation: {
          id: string;
          event_night_id: string;
          holder_name: string;
          cap: number;
          auto_approve: boolean;
          list_open: boolean;
          plus_ones_allowed: boolean;
        };
      }>();

    if (!tierRow) {
      return { ok: false, error: "Tier sub-link not found." };
    }
    if (tierRow.revoked_at) {
      return { ok: false, error: "Tier sub-link revoked." };
    }
    if (tierRow.allocation.event_night_id !== night.id) {
      return { ok: false, error: "Tier sub-link doesn't match this night." };
    }
    alloc = {
      id: tierRow.allocation.id,
      cap: tierRow.allocation.cap,
      auto_approve: tierRow.allocation.auto_approve,
      list_open: tierRow.allocation.list_open,
      plus_ones_allowed: tierRow.allocation.plus_ones_allowed,
    };
    subTokenTier = {
      id: tierRow.id,
      cap: tierRow.cap,
      tier: tierRow.tier,
    };
  } else {
    // Legacy / Walk-up path. Find-or-create the walk-up allocation for
    // this night.
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

    if (existing) {
      alloc = existing;
    } else {
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
        return {
          ok: false,
          error: allocErr?.message ?? "Could not open walk-up list.",
        };
      }
      alloc = inserted;
    }
  }

  if (!alloc) {
    return { ok: false, error: "Could not resolve allocation." };
  }
  if (!alloc.list_open) {
    return { ok: false, error: "List is closed." };
  }

  // Pick the tier we're going to record on the guest row. Sub-token wins;
  // explicit tier param next; default GA.
  const guestTier: "ga" | "vip" | "aaa" =
    (subTokenTier?.tier as "ga" | "vip" | "aaa" | undefined) ??
    input.tier ??
    "ga";

  // Enforce cap. Count approved + pending on this allocation.
  const { data: used } = await admin
    .from("guests")
    .select("plus_ones, status, tier")
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);
  const usedTotal = (used ?? []).reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0,
  );
  const plusOnes = alloc.plus_ones_allowed
    ? Math.max(0, Math.min(10, input.plusOnes))
    : 0;
  const needed = 1 + plusOnes;
  if (usedTotal + needed > alloc.cap) {
    return {
      ok: false,
      error: `List is full (${usedTotal}/${alloc.cap}).`,
    };
  }

  // Day 50: per-tier cap enforcement when a sub_token routed us here.
  if (subTokenTier) {
    const tierUsed = (used ?? [])
      .filter((g) => (g.tier ?? "ga").toLowerCase() === guestTier)
      .reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);
    if (tierUsed + needed > subTokenTier.cap) {
      return {
        ok: false,
        error: `${guestTier.toUpperCase()} tier full (${tierUsed}/${subTokenTier.cap}).`,
      };
    }
  }

  const status: "approved" | "pending" = alloc.auto_approve ? "approved" : "pending";

  // Recognize prior invitee — Day 50 tag-and-merge. If this phone has
  // signed up before (any event), we link the new guest row to the
  // existing identity. The brief: "If a guest later makes an account,
  // all their past history (RSVPs, attended events, tier upgrades)
  // should appear." That requires a stable identity_id across rows.
  const trimmed = fullName.trim();
  const spaceAt = trimmed.indexOf(" ");
  const firstName = spaceAt > 0 ? trimmed.slice(0, spaceAt) : trimmed;
  const lastName =
    spaceAt > 0 ? trimmed.slice(spaceAt + 1).trim() || null : null;

  let identityId: string | null = null;
  const { data: identityIdRaw } = await admin.rpc("upsert_guest_identity", {
    p_phone: input.phone,
    p_email: input.email,
    p_full_name: fullName,
    p_first_name: firstName,
    p_last_name: lastName,
  });
  if (typeof identityIdRaw === "string") {
    identityId = identityIdRaw;
  }

  const { data: guest, error: guestErr } = await admin
    .from("guests")
    .insert({
      event_night_id: night.id,
      allocation_id: alloc.id,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: input.phone,
      email: input.email,
      plus_ones: plusOnes,
      status,
      tier: guestTier,
      identity_id: identityId,
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
