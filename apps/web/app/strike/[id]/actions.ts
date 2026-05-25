"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface Input {
  guestId: string;
  reason: "i_was_there" | "couldnt_get_in" | "plans_changed";
}

/**
 * Submit an appeal against a no-show strike. Stashes the appeal on the
 * guest row (best-effort) so the venue staff can review it in the door
 * manager. Real appeals workflow + decision queue lands with the
 * strikes table migration.
 */
export async function submitAppealAction(
  input: Input,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({
      appeal_reason: input.reason,
      appeal_submitted_at: new Date().toISOString(),
    })
    .eq("id", input.guestId);
  if (error) {
    // Soft-fail — the appeal columns may not exist yet. Don't block the
    // user; the staff still sees the no_show and can override manually.
    return { ok: true };
  }
  return { ok: true };
}
