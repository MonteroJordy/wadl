"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface Input {
  token: string;
  name: string;
  phone: string;
}

/** Loose E.164-ish normalize. We don't fail on non-US numbers. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  // If it starts with + keep it; otherwise assume US.
  if (digits.startsWith("+")) {
    return digits.length >= 8 ? digits : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Best effort — let it through.
  return digits.length >= 7 ? `+${digits}` : null;
}

export async function submitGuestlessRsvpAction(
  input: Input,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (!name) return { ok: false, error: "Add your name." };
  if (!phone) return { ok: false, error: "That phone number didn't look right." };

  const supabase = createAdminClient();

  // Re-fetch the allocation (don't trust the client's token alone).
  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, cap, list_open, guestless, event_night_id")
    .eq("magic_link_token", input.token)
    .maybeSingle();
  if (!alloc || !alloc.guestless || !alloc.list_open) {
    return { ok: false, error: "This list isn't open." };
  }

  // Capacity check at the moment of submit.
  const { count: filled } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);
  if ((filled ?? 0) >= alloc.cap) {
    return { ok: false, error: "Just hit the cap — try again later in case spots open up." };
  }

  // Idempotency: if the same phone already RSVP'd on this allocation,
  // hand them back their existing pass instead of double-adding.
  const { data: existing } = await supabase
    .from("guests")
    .select("id, qr_token")
    .eq("allocation_id", alloc.id)
    .eq("phone", phone)
    .maybeSingle();
  if (existing?.qr_token) {
    redirect(`/g/${input.token}/pass?g=${existing.qr_token}`);
  }

  const qrToken = crypto.randomBytes(16).toString("hex");
  const { error: insertErr } = await supabase.from("guests").insert({
    event_night_id: alloc.event_night_id,
    allocation_id: alloc.id,
    full_name: name,
    phone,
    status: "approved",
    qr_token: qrToken,
    guestless: true,
    phone_unverified: true,
    approved_at: new Date().toISOString(),
  });
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  redirect(`/g/${input.token}/pass?g=${qrToken}`);
}
