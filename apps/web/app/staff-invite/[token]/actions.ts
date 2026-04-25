"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcceptInviteResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Accept a staff invite. Assumes the browser has already verified phone OTP
 * (so we have a Supabase session). We validate the invite token, bind the
 * event_staff row to the authenticated user, and set profiles.role if it
 * would be a role upgrade from 'guest'. Owners keep their 'owner' role.
 */
export async function acceptInviteAction(
  token: string
): Promise<AcceptInviteResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Verify your phone first." };

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("staff_invites")
    .select("id, event_id, role, used_at, expires_at")
    .eq("token", token)
    .maybeSingle<{
      id: string;
      event_id: string;
      role: "door_staff" | "door_manager";
      used_at: string | null;
      expires_at: string | null;
    }>();

  if (!invite) return { ok: false, error: "Invite not found." };
  if (invite.used_at) return { ok: false, error: "Invite already used." };
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Invite expired." };
  }

  // Bind event_staff. Upsert handles double-accept.
  const { error: staffErr } = await admin
    .from("event_staff")
    .upsert(
      {
        event_id: invite.event_id,
        user_id: user.id,
        role: invite.role,
      },
      { onConflict: "event_id,user_id" }
    );
  if (staffErr) return { ok: false, error: staffErr.message };

  // Upgrade role unless the user is already an owner (don't demote them).
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile && profile.role !== "owner") {
    await admin.from("profiles").update({ role: invite.role }).eq("id", user.id);
  }

  await admin
    .from("staff_invites")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", invite.id);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "staff.invite_accepted",
    entity_type: "staff_invite",
    entity_id: invite.id,
    event_id: invite.event_id,
    context: { role: invite.role },
  });

  const redirectTo =
    invite.role === "door_manager"
      ? `/manager/events/${invite.event_id}`
      : `/door/events/${invite.event_id}`;

  return { ok: true, redirectTo };
}
