"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotifPrefs {
  channels: { push: boolean; email: boolean; sms: boolean };
  kinds: Record<string, boolean>;
  quiet_hours: { enabled: boolean; start: string; end: string };
}

export async function saveNotifPrefsAction(
  prefs: NotifPrefs
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await requireOwnerContext();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ notif_prefs: prefs as unknown as Record<string, unknown> })
    .eq("id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/owner/profile/notifications");
  revalidatePath("/owner/profile");
  return { ok: true };
}
