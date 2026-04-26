"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveAccountMetaAction(input: {
  handle: string | null;
  city: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  // Sanity-check handle: alphanumeric + dot/underscore + dash only, max 30.
  const h = input.handle?.replace(/^@/, "") ?? null;
  if (h && !/^[a-zA-Z0-9._-]{1,30}$/.test(h)) {
    return {
      ok: false,
      error:
        "Handle: letters, numbers, . _ -. Up to 30 chars. No @ — we add it.",
    };
  }
  const c = input.city?.trim().slice(0, 60) ?? null;

  const { error } = await admin
    .from("accounts")
    .update({ handle: h, city: c, updated_at: new Date().toISOString() })
    .eq("id", account.id);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    action: "account.meta.updated",
    entity_type: "account",
    entity_id: account.id,
    context: { handle: h, city: c },
  });

  revalidatePath("/owner/profile");
  revalidatePath("/owner");
  return { ok: true };
}
