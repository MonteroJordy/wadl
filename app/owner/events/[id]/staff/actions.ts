"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/routing";
import { sendSms } from "@/lib/sms";
import { getAppUrl } from "@/lib/app-url";

type StaffRole = "door_staff" | "door_manager";

export type CreateInviteResult =
  | { ok: true; inviteUrl: string; smsProvider: "dev" | "twilio" }
  | { ok: false; error: string };

export async function createInviteAction(
  eventId: string,
  formData: FormData
): Promise<CreateInviteResult> {
  const phoneRaw = (formData.get("phone") as string | null) ?? "";
  const role = formData.get("role") as StaffRole | null;

  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "Enter a valid phone number." };
  if (role !== "door_staff" && role !== "door_manager") {
    return { ok: false, error: "Pick a role." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const { data: invite, error } = await supabase
    .from("staff_invites")
    .insert({
      event_id: eventId,
      phone,
      role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error || !invite) {
    return { ok: false, error: error?.message ?? "Could not create invite." };
  }

  const inviteUrl = `${getAppUrl()}/staff-invite/${invite.token}`;
  const body = `WADL: you're invited to work the door as ${role === "door_manager" ? "a manager" : "staff"}. Open ${inviteUrl} on your phone to sign in.`;

  const smsRes = await sendSms({ to: phone, body });
  const smsProvider: "dev" | "twilio" =
    smsRes.ok && smsRes.provider === "twilio" ? "twilio" : "dev";

  revalidatePath(`/owner/events/${eventId}/staff`);

  return { ok: true, inviteUrl, smsProvider };
}

export async function revokeInviteAction(
  eventId: string,
  inviteId: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("staff_invites")
    .delete()
    .eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/staff`);
  return { ok: true as const };
}

export async function removeStaffAction(
  eventId: string,
  userId: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("event_staff")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  // Also clear their role if they have no other event_staff rows.
  const admin = createAdminClient();
  const { count } = await admin
    .from("event_staff")
    .select("event_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) === 0) {
    await admin.from("profiles").update({ role: "guest" }).eq("id", userId);
  }

  revalidatePath(`/owner/events/${eventId}/staff`);
  return { ok: true as const };
}
