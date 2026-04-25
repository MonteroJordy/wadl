"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestMutateAccess } from "@/lib/guest-access";
import { sendSms } from "@/lib/sms";
import { getAppUrl } from "@/lib/app-url";

export type Tier = "ga" | "vip" | "all_access";
export const PRESET_TAGS = ["VIP Regular", "Influencer", "Watch"] as const;

export async function updateGuestNotesAction(
  guestId: string,
  notes: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const access = await resolveGuestMutateAccess(user.id, guestId);
  if (!access) return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("guests")
    .update({ notes: notes.trim() || null })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/owner/events/${access.eventId}/guests/${guestId}`);
  revalidatePath(`/manager/events/${access.eventId}/guests/${guestId}`);
  return { ok: true };
}

export async function updateGuestTagsAction(
  guestId: string,
  tags: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const access = await resolveGuestMutateAccess(user.id, guestId);
  if (!access) return { ok: false, error: "Not authorized." };

  const cleaned = tags
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  const admin = createAdminClient();
  const { error } = await admin
    .from("guests")
    .update({ tags: cleaned })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/owner/events/${access.eventId}/guests/${guestId}`);
  revalidatePath(`/manager/events/${access.eventId}/guests/${guestId}`);
  return { ok: true };
}

/**
 * Owner upgrade of a guest's tier. Records timestamp so the next time the
 * guest views /mytickets, a banner notifies them. SMS goes out immediately.
 */
export async function upgradeTierAction(
  guestId: string,
  newTier: Tier
): Promise<{ ok: true } | { ok: false; error: string }> {
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
    .select("id, full_name, tier, phone, check_in_token, event_night_id, night:event_nights!inner(event:events!inner(name))")
    .eq("id", guestId)
    .maybeSingle<{
      id: string;
      full_name: string;
      tier: string;
      phone: string | null;
      check_in_token: string | null;
      event_night_id: string;
      night: { event: { name: string } };
    }>();
  if (!guest) return { ok: false, error: "Guest not found." };
  if (guest.tier === newTier) return { ok: false, error: "Already on that tier." };

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("guests")
    .update({
      tier: newTier,
      tier_upgraded_at: nowIso,
      tier_upgrade_seen_at: null,
    })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "guest.tier_upgraded",
    entity_type: "guest",
    entity_id: guestId,
    event_id: access.eventId,
    context: { from: guest.tier, to: newTier },
  });

  if (guest.phone) {
    const tierLabel = newTier === "all_access" ? "ALL ACCESS" : newTier.toUpperCase();
    const ticketUrl = guest.check_in_token
      ? `${getAppUrl()}/t/${guest.check_in_token}`
      : `${getAppUrl()}/mytickets`;
    await sendSms({
      to: guest.phone,
      body: `WADL: you've been upgraded to ${tierLabel} for ${guest.night.event.name}. ${ticketUrl}`,
    });
  }

  revalidatePath(`/owner/events/${access.eventId}/guests/${guestId}`);
  revalidatePath(`/mytickets`);
  return { ok: true };
}
