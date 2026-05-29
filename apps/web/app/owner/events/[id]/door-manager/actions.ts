"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface WalkInInput {
  eventId: string;
  nightId: string;
  name: string;
  phone: string | null;
  tier: "ga" | "vip" | "aaa";
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 7 ? `+${digits}` : null;
}

async function assertOwnership(supabase: ReturnType<typeof createClient>, eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Session expired." };

  const { data: ev } = await supabase
    .from("events")
    .select("id, account_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return { ok: false as const, error: "Event not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.account_id !== ev.account_id) {
    return { ok: false as const, error: "Not authorized." };
  }
  return { ok: true as const, accountId: ev.account_id, userId: user.id };
}

export async function addWalkInAction(
  input: WalkInInput,
): Promise<{ ok: true; guestId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name required." };
  const supabase = createClient();
  const ownership = await assertOwnership(supabase, input.eventId);
  if (!ownership.ok) return { ok: false, error: ownership.error };

  const qrToken = crypto.randomBytes(16).toString("hex");
  const { data, error } = await supabase
    .from("guests")
    .insert({
      event_night_id: input.nightId,
      full_name: name,
      phone: normalizePhone(input.phone),
      tier: input.tier,
      status: "approved",
      qr_token: qrToken,
      added_by_user_id: ownership.userId,
      approved_by: ownership.userId,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Insert failed." };
  }

  // Walk-in counts as a check-in: log it.
  await supabase.from("check_ins").insert({
    guest_id: data.id,
    event_night_id: input.nightId,
    method: "walk_in",
    scanned_by: ownership.userId,
  });

  revalidatePath(`/owner/events/${input.eventId}/door-manager`);
  return { ok: true, guestId: data.id };
}

export async function markNoShowAction(
  eventId: string,
  guestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const ownership = await assertOwnership(supabase, eventId);
  if (!ownership.ok) return { ok: false, error: ownership.error };

  const { error } = await supabase
    .from("guests")
    .update({ status: "no_show" })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/owner/events/${eventId}/door-manager`);
  return { ok: true };
}

export async function changeTierAction(
  eventId: string,
  guestId: string,
  tier: "ga" | "vip" | "aaa",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const ownership = await assertOwnership(supabase, eventId);
  if (!ownership.ok) return { ok: false, error: ownership.error };

  const { error } = await supabase
    .from("guests")
    .update({ tier })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/owner/events/${eventId}/door-manager`);
  return { ok: true };
}
