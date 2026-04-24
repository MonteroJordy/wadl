"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function managerApproveGuestAction(
  eventId: string,
  guestId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("guests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", guestId);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "manager.approve_inline",
    entity_type: "guest",
    entity_id: guestId,
  });

  revalidatePath(`/manager/events/${eventId}`);
  revalidatePath(`/door/events/${eventId}`);
  return { ok: true as const };
}

export async function managerRejectGuestAction(
  eventId: string,
  guestId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("guests")
    .update({ status: "rejected" })
    .eq("id", guestId);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "manager.reject_inline",
    entity_type: "guest",
    entity_id: guestId,
  });

  revalidatePath(`/manager/events/${eventId}`);
  return { ok: true as const };
}
