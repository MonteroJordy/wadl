"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { getAppUrl } from "@/lib/app-url";
import { normalizePhone } from "@/lib/routing";

type Permission = "read_only" | "edit" | "admin";

export type CoOwnerInviteResult =
  | { ok: true; inviteUrl: string; smsProvider: "dev" | "twilio" }
  | { ok: false; error: string };

export async function createCoOwnerInviteAction(
  eventId: string,
  formData: FormData
): Promise<CoOwnerInviteResult> {
  const phoneRaw = (formData.get("phone") as string | null) ?? "";
  const email = ((formData.get("email") as string | null) ?? "").trim();
  const permission = formData.get("permission") as Permission | null;

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (!phone && !email) return { ok: false, error: "Enter a phone or email." };
  if (!permission || !["read_only", "edit", "admin"].includes(permission)) {
    return { ok: false, error: "Pick a permission level." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const { data: invite, error } = await supabase
    .from("co_owner_invites")
    .insert({
      event_id: eventId,
      invitee_email: email || null,
      invitee_phone: phone,
      permission,
      invited_by: user.id,
    })
    .select("token")
    .single();
  if (error || !invite) {
    return { ok: false, error: error?.message ?? "Could not create invite." };
  }

  const inviteUrl = `${getAppUrl()}/co-owner/accept/${invite.token}`;
  let smsProvider: "dev" | "twilio" = "dev";

  if (phone) {
    const body = `WADL: you've been invited to co-own an event (${permission.replace("_", "-")}). Open ${inviteUrl} to accept.`;
    const res = await sendSms({ to: phone, body });
    if (res.ok) smsProvider = res.provider;
  }

  revalidatePath(`/owner/events/${eventId}/co-owners`);
  return { ok: true, inviteUrl, smsProvider };
}

export async function revokeCoOwnerInviteAction(
  eventId: string,
  inviteId: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("co_owner_invites")
    .delete()
    .eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/co-owners`);
  return { ok: true as const };
}

export async function removeCoOwnerAction(eventId: string, accountId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("event_co_owners")
    .delete()
    .eq("event_id", eventId)
    .eq("account_id", accountId);
  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    action: "co_owner.removed",
    entity_type: "event",
    entity_id: eventId,
    event_id: eventId,
    context: { account_id: accountId },
  });

  revalidatePath(`/owner/events/${eventId}/co-owners`);
  return { ok: true as const };
}
