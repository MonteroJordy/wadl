"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Tier = "ga" | "vip" | "all_access";

export async function managerAddGuestAction(
  eventId: string,
  formData: FormData
) {
  const nightId = formData.get("night_id") as string | null;
  const fullName = (formData.get("full_name") as string | null)?.trim();
  const phone = (formData.get("phone") as string | null)?.trim();
  const allocationId = formData.get("allocation_id") as string | null;
  const tier = formData.get("tier") as Tier | null;
  const plusOnesStr = formData.get("plus_ones") as string | null;

  if (!nightId) return { error: "Missing night." };
  if (!fullName) return { error: "Enter a name." };
  if (!allocationId) return { error: "Pick an allocation." };
  if (tier !== "ga" && tier !== "vip" && tier !== "all_access") {
    return { error: "Pick a tier." };
  }
  const plusOnes = Math.max(0, Math.min(10, parseInt(plusOnesStr ?? "0", 10) || 0));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const admin = createAdminClient();

  // Verify allocation belongs to this night.
  const { data: alloc } = await admin
    .from("allocations")
    .select("id, event_night_id, cap")
    .eq("id", allocationId)
    .eq("event_night_id", nightId)
    .maybeSingle<{ id: string; event_night_id: string; cap: number }>();
  if (!alloc) return { error: "Allocation not found for this night." };

  // Cap check.
  const { data: used } = await admin
    .from("guests")
    .select("plus_ones, status")
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);
  const usedTotal = (used ?? []).reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0
  );
  if (usedTotal + 1 + plusOnes > alloc.cap) {
    return { error: `Over cap (${usedTotal}/${alloc.cap}).` };
  }

  const nowIso = new Date().toISOString();

  const { data: guest, error: guestErr } = await admin
    .from("guests")
    .insert({
      event_night_id: nightId,
      allocation_id: alloc.id,
      full_name: fullName,
      phone: phone || null,
      tier,
      plus_ones: plusOnes,
      status: "approved",
      approved_by: user.id,
      approved_at: nowIso,
      added_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (guestErr || !guest) {
    return { error: guestErr?.message ?? "Could not create guest." };
  }

  const { error: checkInErr } = await admin.from("check_ins").insert({
    guest_id: guest.id,
    event_night_id: nightId,
    scanned_by: user.id,
    state: "approved",
  });
  if (checkInErr) return { error: checkInErr.message };

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "manual_add_at_door",
    entity_type: "guest",
    entity_id: guest.id,
    event_id: eventId,
    context: {
      allocation_id: alloc.id,
      tier,
      plus_ones: plusOnes,
      full_name: fullName,
    },
  });

  revalidatePath(`/manager/events/${eventId}`);
  revalidatePath(`/door/events/${eventId}`);
  redirect(`/manager/events/${eventId}?night=${nightId}&status=in`);
}
