"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoPromoteOnNight } from "@/lib/waitlist";

export async function moveToWaitlistAction(
  eventId: string,
  guestId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("guests")
    .update({ status: "waitlisted" })
    .eq("id", guestId);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "guest.waitlisted",
    entity_type: "guest",
    entity_id: guestId,
    event_id: eventId,
  });

  revalidatePath(`/owner/events/${eventId}/waitlist`);
  revalidatePath(`/owner/events/${eventId}/queue`);
  return { ok: true as const };
}

export async function manualPromoteAction(
  eventId: string,
  guestId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select("id, event_night_id, phone, check_in_token, full_name")
    .eq("id", guestId)
    .maybeSingle<{
      id: string;
      event_night_id: string;
      phone: string | null;
      check_in_token: string | null;
      full_name: string;
    }>();
  if (!guest) return { error: "Guest not found." };

  await admin
    .from("guests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", guestId);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "waitlist.manual_promoted",
    entity_type: "guest",
    entity_id: guestId,
    event_id: eventId,
  });

  // Best-effort SMS.
  if (guest.phone && guest.check_in_token) {
    const { sendSms } = await import("@/lib/sms");
    const { getAppUrl } = await import("@/lib/app-url");
    await sendSms({
      to: guest.phone,
      body: `WADL: you're off the waitlist. ${getAppUrl()}/t/${guest.check_in_token}`,
    });
  }

  revalidatePath(`/owner/events/${eventId}/waitlist`);
  return { ok: true as const };
}

/**
 * Cancel a guest. If they were approved, frees a seat; we then auto-promote
 * the oldest waitlisted guest on the same night (if any).
 */
export async function cancelGuestAction(
  eventId: string,
  guestId: string
): Promise<{ ok: true; promotedId: string | null } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select("id, status, event_night_id")
    .eq("id", guestId)
    .maybeSingle<{ id: string; status: string; event_night_id: string }>();
  if (!guest) return { ok: false, error: "Guest not found." };

  const wasApproved = guest.status === "approved";

  await admin
    .from("guests")
    .update({ status: "cancelled" })
    .eq("id", guestId);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "guest.cancelled",
    entity_type: "guest",
    entity_id: guestId,
    event_id: eventId,
  });

  let promotedId: string | null = null;
  if (wasApproved) {
    const promote = await autoPromoteOnNight(guest.event_night_id, user.id);
    promotedId = promote.promotedGuestId;
  }

  revalidatePath(`/owner/events/${eventId}/waitlist`);
  revalidatePath(`/owner/events/${eventId}/queue`);
  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true, promotedId };
}
