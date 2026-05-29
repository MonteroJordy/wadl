"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createAllocationAction(
  eventId: string,
  formData: FormData,
) {
  const nightId = formData.get("night_id") as string | null;
  const holderName = (formData.get("holder_name") as string | null)?.trim();
  const holderPhone = (formData.get("holder_phone") as string | null)?.trim();
  const holderEmail = (formData.get("holder_email") as string | null)?.trim();
  const capStr = formData.get("cap") as string | null;
  const gaCapStr = formData.get("ga_cap") as string | null;
  const vipCapStr = formData.get("vip_cap") as string | null;
  const aaaCapStr = formData.get("aaa_cap") as string | null;
  const autoApprove = formData.get("auto_approve") === "on";
  const plusOnes = formData.get("plus_ones_allowed") === "on";

  if (!nightId) return { error: "Pick a night." };
  if (!holderName) return { error: "Holder name required." };
  const cap = capStr ? parseInt(capStr, 10) : 0;
  if (!cap || cap < 1) return { error: "Cap must be at least 1." };

  const gaCap = Math.max(0, parseInt(gaCapStr ?? "0", 10) || 0);
  const vipCap = Math.max(0, parseInt(vipCapStr ?? "0", 10) || 0);
  const aaaCap = Math.max(0, parseInt(aaaCapStr ?? "0", 10) || 0);
  if (gaCap + vipCap + aaaCap !== cap) {
    return {
      error: `Per-tier caps (${gaCap + vipCap + aaaCap}) must equal total cap (${cap}).`,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { data: alloc, error } = await supabase
    .from("allocations")
    .insert({
      event_night_id: nightId,
      holder_name: holderName,
      holder_phone: holderPhone || null,
      holder_email: holderEmail || null,
      cap,
      auto_approve: autoApprove,
      plus_ones_allowed: plusOnes,
      list_open: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !alloc)
    return { error: error?.message ?? "Could not create allocation." };

  // Mint the first magic-link token via service role (RLS blocks client inserts).
  const admin = createAdminClient();
  const { error: tokErr } = await admin
    .from("allocation_tokens")
    .insert({ allocation_id: alloc.id });
  if (tokErr) return { error: `Token error: ${tokErr.message}` };

  // Day 50: insert per-tier sub-caps. Each row mints its own sub_token
  // automatically via the column default. If the table doesn't exist
  // yet (migration not applied) we silently skip — the legacy single-cap
  // path still works via allocation_tokens above.
  const tierRows = [
    { tier: "ga", cap: gaCap },
    { tier: "vip", cap: vipCap },
    { tier: "aaa", cap: aaaCap },
  ].filter((r) => r.cap > 0);

  if (tierRows.length > 0) {
    const { error: tierErr } = await admin
      .from("allocation_tier_caps")
      .insert(
        tierRows.map((r) => ({
          allocation_id: alloc.id,
          tier: r.tier,
          cap: r.cap,
        })),
      );
    if (tierErr && !tierErr.message.includes("does not exist")) {
      // Log but don't fail — legacy single-token still works.
      console.warn("[createAllocation] tier_caps insert failed:", tierErr.message);
    }
  }

  revalidatePath(`/owner/events/${eventId}/allocations`);
  redirect(`/owner/events/${eventId}/allocations/${alloc.id}`);
}
