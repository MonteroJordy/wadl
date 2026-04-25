"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcceptResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

export async function acceptCoOwnerInviteAction(
  token: string
): Promise<AcceptResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Verify your phone first." };

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("co_owner_invites")
    .select("id, event_id, permission, used_at, expires_at")
    .eq("token", token)
    .maybeSingle<{
      id: string;
      event_id: string;
      permission: "read_only" | "edit" | "admin";
      used_at: string | null;
      expires_at: string | null;
    }>();
  if (!invite) return { ok: false, error: "Invite not found." };
  if (invite.used_at) return { ok: false, error: "Invite already used." };
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Invite expired." };
  }

  // Resolve invitee's account (must be an account owner to accept).
  const { data: profile } = await admin
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();

  if (!profile?.account_id) {
    return {
      ok: false,
      error: "Set up your own account first, then accept this invite.",
    };
  }

  const { error: insertErr } = await admin.from("event_co_owners").upsert(
    {
      event_id: invite.event_id,
      account_id: profile.account_id,
      permission: invite.permission,
      invited_by: null,
    },
    { onConflict: "event_id,account_id" }
  );
  if (insertErr) return { ok: false, error: insertErr.message };

  await admin
    .from("co_owner_invites")
    .update({ used_at: new Date().toISOString(), used_by_account_id: profile.account_id })
    .eq("id", invite.id);

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "co_owner.accepted",
    entity_type: "event",
    entity_id: invite.event_id,
    event_id: invite.event_id,
    context: { permission: invite.permission, account_id: profile.account_id },
  });

  return { ok: true, eventId: invite.event_id };
}
