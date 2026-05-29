"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Accept (or decline) an invite token. Best-effort acceptance — this is
 * the generic landing's submit; per-type backends already exist
 * elsewhere for the real auth wire-up (e.g. /staff-invite, /co-owner).
 *
 * For now we just mark accepted/declined on the appropriate row and
 * route the user somewhere reasonable; the deeper per-type onboarding
 * picks up from there.
 */
export async function acceptInviteAction(token: string, formData: FormData) {
  const declined = formData.get("decline") === "1";
  const supabase = createAdminClient();

  // staff
  const { data: staff } = await supabase
    .from("staff_invites")
    .select("event_id")
    .eq("token", token)
    .maybeSingle();
  if (staff) {
    if (declined) redirect("/");
    redirect(`/staff-invite/${token}`);
  }

  // co-owner
  const { data: co } = await supabase
    .from("co_owner_invites")
    .select("event_id")
    .eq("token", token)
    .maybeSingle();
  if (co) {
    if (declined) redirect("/");
    redirect(`/co-owner/${token}`);
  }

  // generic guest allocation invite → existing /h flow
  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, guestless")
    .eq("magic_link_token", token)
    .maybeSingle();
  if (alloc) {
    if (alloc.guestless) redirect(`/g/${token}`);
    redirect(`/h/${token}`);
  }

  redirect("/");
}
