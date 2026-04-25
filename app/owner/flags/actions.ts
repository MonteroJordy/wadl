"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestMutateAccess } from "@/lib/guest-access";

export async function bulkUnflagAction(
  guestIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  let count = 0;
  const admin = createAdminClient();
  for (const id of guestIds) {
    const access = await resolveGuestMutateAccess(user.id, id);
    if (!access) continue;
    const { error } = await admin
      .from("guests")
      .update({ flag_dna: false, flag_reason: null })
      .eq("id", id);
    if (!error) {
      count++;
      await admin.from("audit_log").insert({
        actor_user_id: user.id,
        action: "guest.unflag_dna",
        entity_type: "guest",
        entity_id: id,
        event_id: access.eventId,
        context: { via: "bulk_unflag" },
      });
    }
  }
  revalidatePath("/owner/flags");
  return { ok: true, count };
}
