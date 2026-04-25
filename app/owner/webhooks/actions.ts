"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { deliverPending } from "@/lib/webhooks";

export async function createWebhookAction(
  url: string,
  events: string
): Promise<{ ok: true; secret: string } | { ok: false; error: string }> {
  const trimmed = url.trim();
  if (!/^https?:\/\//.test(trimmed)) return { ok: false, error: "URL must start with http(s)://" };

  const { supabase, account } = await requireOwnerContext();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      account_id: account.id,
      url: trimmed,
      events: events.trim() || "*",
    })
    .select("secret")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/webhooks");
  return { ok: true, secret: data.secret };
}

export async function toggleWebhookAction(
  id: string,
  active: boolean
): Promise<void> {
  const { supabase, account } = await requireOwnerContext();
  await supabase
    .from("webhook_endpoints")
    .update({ active })
    .eq("id", id)
    .eq("account_id", account.id);
  revalidatePath("/owner/webhooks");
}

export async function deleteWebhookAction(id: string): Promise<void> {
  const { supabase, account } = await requireOwnerContext();
  await supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("account_id", account.id);
  revalidatePath("/owner/webhooks");
}

export async function retryDeliveriesAction(): Promise<void> {
  await deliverPending();
  revalidatePath("/owner/webhooks");
}
