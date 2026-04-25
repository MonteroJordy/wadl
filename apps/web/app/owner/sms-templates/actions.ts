"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES } from "@/lib/sms-templates";

export async function upsertTemplateAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Session expired." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) return { ok: false as const, error: "No account." };

  const key = (formData.get("key") as string | null)?.trim() ?? "";
  const label = (formData.get("label") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null) ?? "";
  if (!key || !label || !body.trim()) {
    return { ok: false as const, error: "Key, label, and body are all required." };
  }

  const { error } = await supabase
    .from("sms_templates")
    .upsert(
      {
        account_id: profile.account_id,
        key,
        label,
        body,
      },
      { onConflict: "account_id,key" }
    );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/owner/sms-templates");
  return { ok: true as const };
}

export async function deleteTemplateAction(key: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Session expired." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) return { ok: false as const, error: "No account." };

  const { error } = await supabase
    .from("sms_templates")
    .delete()
    .eq("account_id", profile.account_id)
    .eq("key", key);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/owner/sms-templates");
  return { ok: true as const };
}

export async function seedDefaultsAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Session expired." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) return { ok: false as const, error: "No account." };

  const rows = DEFAULT_TEMPLATES.map((t) => ({
    ...t,
    account_id: profile.account_id!,
  }));
  const { error } = await supabase
    .from("sms_templates")
    .upsert(rows, { onConflict: "account_id,key", ignoreDuplicates: true });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/owner/sms-templates");
  return { ok: true as const };
}
