"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

interface TokenLookup {
  token: string;
  allocation_id: string;
  revoked_at: string | null;
  expires_at: string | null;
  allocation: {
    id: string;
    event_night_id: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
}

async function resolveToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("allocation_tokens")
    .select(
      "token, allocation_id, revoked_at, expires_at, allocation:allocations!inner(id, event_night_id, cap, auto_approve, list_open, plus_ones_allowed)"
    )
    .eq("token", token)
    .maybeSingle<TokenLookup>();
  if (!data) return { error: "This link is no longer valid." };
  if (data.revoked_at) return { error: "This link has been rotated." };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "This link has expired." };
  }
  return { data };
}

export async function addHolderGuestAction(token: string, formData: FormData) {
  const fullName = (formData.get("full_name") as string | null)?.trim();
  const plusOnesStr = formData.get("plus_ones") as string | null;
  if (!fullName) return { error: "Enter a name." };

  const lookup = await resolveToken(token);
  if ("error" in lookup) return { error: lookup.error };
  const { allocation } = lookup.data;

  if (!allocation.list_open) {
    return { error: "This list is closed." };
  }

  const admin = createAdminClient();

  // Enforce cap server-side.
  const { data: existing } = await admin
    .from("guests")
    .select("plus_ones, status")
    .eq("allocation_id", allocation.id)
    .in("status", ["approved", "pending"]);
  const used = (existing ?? []).reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0
  );
  const requestedPlusOnes = allocation.plus_ones_allowed
    ? Math.max(0, parseInt(plusOnesStr ?? "0", 10) || 0)
    : 0;
  const requestedTotal = 1 + requestedPlusOnes;
  if (used + requestedTotal > allocation.cap) {
    return { error: `Over cap (${used}/${allocation.cap} used).` };
  }

  const status = allocation.auto_approve ? "approved" : "pending";

  const { error } = await admin.from("guests").insert({
    event_night_id: allocation.event_night_id,
    allocation_id: allocation.id,
    full_name: fullName,
    plus_ones: requestedPlusOnes,
    status,
  });

  if (error) return { error: error.message };

  // Audit: who added this? Holders have no user ID; record via
  // actor_allocation_id so the action is attributed to the holder allocation.
  await admin.from("audit_log").insert({
    actor_allocation_id: allocation.id,
    action: "holder.add_guest",
    entity_type: "guest",
    context: { full_name: fullName, plus_ones: requestedPlusOnes, status },
  });

  revalidatePath(`/h/${token}`);
  return { ok: true as const };
}
