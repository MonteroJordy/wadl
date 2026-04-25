import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { getAppUrl } from "@/lib/app-url";

interface PromoteResult {
  promotedGuestId: string | null;
  smsSent: boolean;
}

/**
 * Promote the oldest waitlisted guest on a night to approved. Returns the
 * promoted guest id, or null if there's nothing to promote.
 *
 * Caller is responsible for ensuring there's actually capacity / a freed
 * seat before calling. We do enforce that the night isn't frozen.
 */
export async function autoPromoteOnNight(
  nightId: string,
  actorUserId: string | null = null
): Promise<PromoteResult> {
  const admin = createAdminClient();

  const { data: night } = await admin
    .from("event_nights")
    .select("id, is_frozen, event_id")
    .eq("id", nightId)
    .maybeSingle<{ id: string; is_frozen: boolean; event_id: string }>();
  if (!night || night.is_frozen) {
    return { promotedGuestId: null, smsSent: false };
  }

  // Pick the oldest waitlisted guest.
  const { data: candidate } = await admin
    .from("guests")
    .select("id, full_name, phone, check_in_token")
    .eq("event_night_id", nightId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{
      id: string;
      full_name: string;
      phone: string | null;
      check_in_token: string | null;
    }>();
  if (!candidate) return { promotedGuestId: null, smsSent: false };

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("guests")
    .update({
      status: "approved",
      approved_by: actorUserId,
      approved_at: nowIso,
    })
    .eq("id", candidate.id);
  if (error) return { promotedGuestId: null, smsSent: false };

  await admin.from("audit_log").insert({
    actor_user_id: actorUserId,
    action: "waitlist.auto_promoted",
    entity_type: "guest",
    entity_id: candidate.id,
    event_id: night.event_id,
  });

  let smsSent = false;
  if (candidate.phone && candidate.check_in_token) {
    const ticketUrl = `${getAppUrl()}/t/${candidate.check_in_token}`;
    const res = await sendSms({
      to: candidate.phone,
      body: `WADL: a spot opened up — you're now on the list. ${ticketUrl}`,
    });
    smsSent = res.ok;
  }

  return { promotedGuestId: candidate.id, smsSent };
}
