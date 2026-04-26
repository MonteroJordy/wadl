"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLATFORM_ADMIN_EMAIL = "jmontero@mainframeagency.com";

async function requirePlatformAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle<{ email: string | null }>();
  if (profile?.email !== PLATFORM_ADMIN_EMAIL) throw new Error("forbidden");
  return user;
}

export async function toggleFeatureFlagAction(
  key: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unauthorized" };
  }
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle<{ enabled: boolean }>();
  if (!row) return { ok: false, error: "flag not found" };
  const { error } = await admin
    .from("feature_flags")
    .update({ enabled: !row.enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  await admin.from("audit_log").insert({
    action: "platform.flag.toggled",
    entity_type: "feature_flag",
    context: { key, new_state: !row.enabled },
  });
  revalidatePath("/admin/feature-flags");
  return { ok: true };
}

export async function setFeatureFlagRolloutAction(
  key: string,
  rolloutPct: number,
  rolloutTarget: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unauthorized" };
  }
  if (!Number.isFinite(rolloutPct) || rolloutPct < 0 || rolloutPct > 100) {
    return { ok: false, error: "rollout_pct must be 0-100" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("feature_flags")
    .update({
      rollout_pct: Math.round(rolloutPct),
      rollout_target: rolloutTarget.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);
  if (error) return { ok: false, error: error.message };
  await admin.from("audit_log").insert({
    action: "platform.flag.rollout",
    entity_type: "feature_flag",
    context: { key, rollout_pct: rolloutPct, rollout_target: rolloutTarget },
  });
  revalidatePath("/admin/feature-flags");
  return { ok: true };
}
