"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestMutateAccess } from "@/lib/guest-access";
import { sendSms } from "@/lib/sms";

export async function sendGuestDmAction(
  guestId: string,
  body: string
): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Empty message." };
  if (trimmed.length > 320)
    return { ok: false, error: "Message too long (>320 chars)." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const access = await resolveGuestMutateAccess(user.id, guestId);
  if (!access) return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, sms_opted_out, event_night_id, " +
        "night:event_nights!inner(event:events!inner(id, account_id))"
    )
    .eq("id", guestId)
    .maybeSingle<{
      id: string;
      full_name: string;
      phone: string | null;
      sms_opted_out: boolean;
      event_night_id: string;
      night: { event: { id: string; account_id: string } };
    }>();

  if (!guest) return { ok: false, error: "Guest not found." };
  if (!guest.phone) return { ok: false, error: "Guest has no phone." };
  if (guest.sms_opted_out)
    return { ok: false, error: "Guest opted out of SMS." };

  const r = await sendSms({
    to: guest.phone,
    body: trimmed,
    log: {
      account_id: guest.night.event.account_id,
      event_id: guest.night.event.id,
      guest_id: guest.id,
      sent_by: user.id,
    },
  });

  await admin.from("guest_messages").insert({
    guest_id: guest.id,
    account_id: guest.night.event.account_id,
    sent_by: user.id,
    body: trimmed,
    channel: "sms",
    delivery_status: r.ok ? "sent" : "failed",
    delivery_error: r.ok ? null : ("error" in r ? r.error : null),
    provider_id: r.ok && "sid" in r ? r.sid ?? null : null,
  });

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "guest.dm_sent",
    entity_type: "guest",
    entity_id: guest.id,
    event_id: guest.night.event.id,
    context: { body_preview: trimmed.slice(0, 80) },
  });

  if (!r.ok) return { ok: false, error: ("error" in r ? r.error : "send failed") };

  revalidatePath(`/owner/events/${access.eventId}/guests/${guestId}`);
  return { ok: true };
}
