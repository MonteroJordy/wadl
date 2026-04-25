"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";

export async function markAllReadAction(): Promise<void> {
  const { supabase, account } = await requireOwnerContext();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("account_id", account.id)
    .is("read_at", null);
  revalidatePath("/owner/notifications");
  revalidatePath("/owner");
}

export async function markReadAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, account } = await requireOwnerContext();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", account.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/notifications");
  return { ok: true };
}
