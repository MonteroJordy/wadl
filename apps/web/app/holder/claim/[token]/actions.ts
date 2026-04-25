"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

export async function claimAllocationAction(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in by phone first." };

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("allocation_tokens")
    .select(
      "token, allocation_id, revoked_at, expires_at, allocation:allocations!inner(id, holder_name, event_night_id, event_night:event_nights!inner(event_id, event:events!inner(id, account_id, name)))"
    )
    .eq("token", token)
    .maybeSingle<{
      token: string;
      allocation_id: string;
      revoked_at: string | null;
      expires_at: string | null;
      allocation: {
        id: string;
        holder_name: string;
        event_night_id: string;
        event_night: {
          event_id: string;
          event: { id: string; account_id: string; name: string };
        };
      };
    }>();
  if (!tokenRow) return { ok: false, error: "Token not found." };
  if (tokenRow.revoked_at) return { ok: false, error: "Token rotated." };
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Token expired." };
  }

  await admin
    .from("allocation_owners")
    .upsert(
      {
        allocation_id: tokenRow.allocation_id,
        user_id: user.id,
        claimed_via_token: token,
      },
      { onConflict: "allocation_id,user_id" }
    );

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "holder.claimed_allocation",
    entity_type: "allocation",
    entity_id: tokenRow.allocation_id,
    event_id: tokenRow.allocation.event_night.event.id,
    context: {
      holder_name: tokenRow.allocation.holder_name,
      via: "holder_claim",
    },
  });

  await notify(tokenRow.allocation.event_night.event.account_id, "co_owner_accepted", {
    message: `${tokenRow.allocation.holder_name} claimed their allocation on ${tokenRow.allocation.event_night.event.name}`,
    href: `/owner/events/${tokenRow.allocation.event_night.event.id}/allocations/${tokenRow.allocation_id}`,
    event_id: tokenRow.allocation.event_night.event.id,
  });

  revalidatePath("/holder");
  return { ok: true };
}
