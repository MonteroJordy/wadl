"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/routing";
import { sendSms } from "@/lib/sms";
import { sendEmail, renderEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";

type StaffRole = "door_staff" | "door_manager" | "photographer";
const VALID_ROLES: StaffRole[] = ["door_staff", "door_manager", "photographer"];

export type CreateInviteResult =
  | {
      ok: true;
      inviteUrl: string;
      smsProvider: "dev" | "twilio";
      emailSent: boolean;
    }
  | { ok: false; error: string };

export async function createInviteAction(
  eventId: string,
  formData: FormData
): Promise<CreateInviteResult> {
  const phoneRaw = (formData.get("phone") as string | null) ?? "";
  const emailRaw = ((formData.get("email") as string | null) ?? "").trim();
  const role = formData.get("role") as StaffRole | null;

  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "Enter a valid phone number." };
  if (!role || !VALID_ROLES.includes(role)) {
    return { ok: false, error: "Pick a role." };
  }
  const email =
    emailRaw && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw : null;

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
  const roleLabel =
    role === "door_manager"
      ? "a door manager"
      : role === "photographer"
      ? "the photographer"
      : "door staff";
  const isPhotographer = role === "photographer";
  const body = isPhotographer
    ? `WADL: you're invited as ${roleLabel}. Open ${inviteUrl} on your phone to sign in and start uploading photos.`
    : `WADL: you're invited to work the door as ${roleLabel}. Open ${inviteUrl} on your phone to sign in.`;

  const smsRes = await sendSms({ to: phone, body });
  const smsProvider: "dev" | "twilio" =
    smsRes.ok && smsRes.provider === "twilio" ? "twilio" : "dev";

  let emailSent = false;
  if (email) {
    const rendered = renderEmail({
      heading: isPhotographer
        ? "You're shooting an event for WADL"
        : "You're on the door for WADL",
      body: isPhotographer
        ? "You've been invited as the photographer. Tap below to sign in and access the upload page."
        : `You've been invited to work the door as ${roleLabel}. Tap the button below on your phone to sign in.`,
      ctaLabel: "Open invite",
      ctaHref: inviteUrl,
      footer: "If you didn't expect this email, you can ignore it.",
    });
    const emailRes = await sendEmail({
      to: email,
      subject: isPhotographer
        ? "WADL: photographer invite"
        : "WADL: door invite",
      html: rendered.html,
      text: rendered.text,
    });
    emailSent = emailRes.ok;
  }

  revalidatePath(`/owner/events/${eventId}/staff`);

  return { ok: true, inviteUrl, smsProvider, emailSent };
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
