"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestMutateAccess } from "@/lib/guest-access";

export async function toggleFlagDnaAction(
  guestId: string,
  flag: boolean,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const access = await resolveGuestMutateAccess(user.id, guestId);
  if (!access) return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const trimmedReason = reason.trim();

  const { error } = await admin
    .from("guests")
    .update({
      flag_dna: flag,
      flag_reason: flag ? trimmedReason || null : null,
    })
    .eq("id", guestId);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: flag ? "guest.flag_dna" : "guest.unflag_dna",
    entity_type: "guest",
    entity_id: guestId,
    event_id: access.eventId,
    context: flag ? { reason: trimmedReason || null } : null,
  });

  revalidatePath(`/owner/events/${access.eventId}/guests/${guestId}`);
  revalidatePath(`/manager/events/${access.eventId}/guests/${guestId}`);
  revalidatePath(`/manager/events/${access.eventId}`);
  revalidatePath(`/owner/events/${access.eventId}`);

  return { ok: true };
}
