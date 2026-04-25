"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

async function requirePlatformAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle<{ email: string | null }>();
  if (profile?.email !== PLATFORM_OWNER_EMAIL) throw new Error("Forbidden");
  return { user };
}

export async function platformForceFlagAction(
  guestId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requirePlatformAdmin();
  const admin = createAdminClient();
  const r = reason.trim() || "Platform-level flag";
  const { error } = await admin
    .from("guests")
    .update({ flag_dna: true, flag_reason: r })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "platform.force_flag",
    entity_type: "guest",
    entity_id: guestId,
    context: { reason: r },
  });
  revalidatePath("/admin/guests");
  return { ok: true };
}
