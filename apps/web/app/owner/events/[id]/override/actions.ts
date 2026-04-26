"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tier } from "@/lib/types";

interface OverrideInput {
  eventId: string;
  nightId: string;
  fullName: string;
  phone: string | null;
  tier: Tier;
  plusOnes: number;
  reason: string;
}

export async function ownerOverrideAdmitAction(
  input: OverrideInput
): Promise<
  | { ok: true; guestId: string }
  | { ok: false; error: string }
> {
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: "Enter a name." };

  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: ev } = await admin
    .from("events")
    .select("id, name, account_id")
    .eq("id", input.eventId)
    .maybeSingle<{ id: string; name: string; account_id: string }>();
  if (!ev || ev.account_id !== account.id)
    return { ok: false, error: "Not authorized." };

  const { data: night } = await admin
    .from("event_nights")
    .select("id, event_id, is_frozen")
    .eq("id", input.nightId)
    .maybeSingle<{ id: string; event_id: string; is_frozen: boolean }>();
  if (!night || night.event_id !== input.eventId)
    return { ok: false, error: "Night not on this event." };

  // Insert as approved + scanned-in. The override skips capacity and frozen-list
  // gates by design — that's the whole point of an override.
  const { data: guest, error: guestErr } = await admin
    .from("guests")
    .insert({
      event_night_id: night.id,
      full_name: fullName,
      phone: input.phone,
      plus_ones: Math.max(0, Math.min(10, input.plusOnes)),
      tier: input.tier,
      status: "approved",
      added_by_user_id: profile.id,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (guestErr || !guest) {
    return { ok: false, error: guestErr?.message ?? "Could not insert." };
  }

  await admin.from("audit_log").insert({
    actor_user_id: profile.id,
    action: "owner.override_admit",
    entity_type: "guest",
    entity_id: guest.id,
    event_id: ev.id,
    context: {
      reason: input.reason || null,
      tier: input.tier,
      plus_ones: input.plusOnes,
      bypassed_lockdown: night.is_frozen,
    },
  });

  revalidatePath(`/owner/events/${input.eventId}`);
  revalidatePath(`/owner/events/${input.eventId}/queue`);
  return { ok: true, guestId: guest.id };
}
