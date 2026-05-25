"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface Input {
  token: string;
  name: string;
  phone: string;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 7 ? `+${digits}` : null;
}

export async function joinWaitlistAction(
  input: Input,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (!name) return { ok: false, error: "Name required." };
  if (!phone) return { ok: false, error: "Phone didn't look right." };

  const supabase = createAdminClient();
  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, event_night_id, guestless")
    .eq("magic_link_token", input.token)
    .maybeSingle();
  if (!alloc || !alloc.guestless) {
    return { ok: false, error: "This list isn't open for waitlist." };
  }

  // Stash on guests with status='waitlist' — a real waitlist table comes
  // with the cap-overflow migration. For now this lets staff see the
  // request inside the door manager guest list.
  const { error } = await supabase.from("guests").insert({
    event_night_id: alloc.event_night_id,
    allocation_id: alloc.id,
    full_name: name,
    phone,
    status: "pending",
    guestless: true,
    phone_unverified: true,
  });
  if (error) {
    // Soft-fail if the status enum doesn't include 'waitlist' yet.
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
