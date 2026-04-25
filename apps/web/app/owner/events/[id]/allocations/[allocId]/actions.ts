"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateInput {
  cap?: number;
  auto_approve?: boolean;
  list_open?: boolean;
  plus_ones_allowed?: boolean;
}

export async function updateAllocationAction(
  eventId: string,
  allocId: string,
  patch: UpdateInput
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("allocations")
    .update(patch)
    .eq("id", allocId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/allocations`);
  revalidatePath(`/owner/events/${eventId}/allocations/${allocId}`);
  return { ok: true as const };
}

export async function regenerateTokenAction(eventId: string, allocId: string) {
  const admin = createAdminClient();
  const { error: revokeErr } = await admin
    .from("allocation_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("allocation_id", allocId)
    .is("revoked_at", null);
  if (revokeErr) return { error: revokeErr.message };

  const { error: insertErr } = await admin
    .from("allocation_tokens")
    .insert({ allocation_id: allocId });
  if (insertErr) return { error: insertErr.message };

  revalidatePath(`/owner/events/${eventId}/allocations/${allocId}`);
  return { ok: true as const };
}
