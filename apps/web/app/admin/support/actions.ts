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

export async function setTicketStatusAction(
  ticketId: string,
  newStatus: "open" | "pending" | "resolved" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unauthorized" };
  }
  const admin = createAdminClient();
  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "resolved" || newStatus === "closed") {
    update.resolved_at = new Date().toISOString();
  } else {
    update.resolved_at = null;
  }
  const { error } = await admin
    .from("support_tickets")
    .update(update)
    .eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  await admin.from("audit_log").insert({
    action: "platform.ticket.status",
    entity_type: "support_ticket",
    entity_id: ticketId,
    context: { new_status: newStatus },
  });
  revalidatePath("/admin/support");
  return { ok: true };
}
