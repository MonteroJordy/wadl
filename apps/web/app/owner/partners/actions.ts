"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export async function addPartnerAction(input: {
  name: string;
  city: string;
  handle: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { account, profile } = await requireOwnerContext();
  const trimName = input.name.trim().slice(0, 100);
  if (!trimName) return { ok: false, error: "Name is required." };
  const admin = createAdminClient();
  const { error } = await admin.from("venue_partners").insert({
    account_id: account.id,
    name: trimName,
    city: input.city.trim().slice(0, 60) || null,
    handle: input.handle.trim().replace(/^@/, "").slice(0, 30) || null,
    notes: input.notes.trim().slice(0, 500) || null,
    created_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/partners");
  return { ok: true };
}

export async function deletePartnerAction(
  partnerId: string
): Promise<{ ok: boolean; error?: string }> {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();
  const { error } = await admin
    .from("venue_partners")
    .delete()
    .eq("id", partnerId)
    .eq("account_id", account.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/partners");
  return { ok: true };
}
