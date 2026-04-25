"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

interface ReferrerLookup {
  id: string;
  full_name: string;
  status: string;
  allocation_id: string | null;
  event_night_id: string;
  allocation: {
    id: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  } | null;
  night: {
    id: string;
    is_frozen: boolean;
    event: { id: string; account_id: string; name: string };
  };
}

export async function addReferralAction(referrerId: string, formData: FormData) {
  const fullName = (formData.get("full_name") as string | null)?.trim();
  const plusOnesStr = formData.get("plus_ones") as string | null;
  if (!fullName) return { error: "Enter a name." };

  const admin = createAdminClient();
  const { data: ref } = await admin
    .from("guests")
    .select(
      "id, full_name, status, allocation_id, event_night_id, " +
        "allocation:allocations(id, cap, auto_approve, list_open, plus_ones_allowed), " +
        "night:event_nights!inner(id, is_frozen, event:events!inner(id, account_id, name))"
    )
    .eq("id", referrerId)
    .maybeSingle<ReferrerLookup>();

  if (!ref) return { error: "Referrer not found." };
  if (ref.status === "cancelled" || ref.status === "rejected")
    return { error: "Your RSVP isn't active — can't refer right now." };
  if (ref.night.is_frozen) return { error: "List is frozen." };

  const alloc = ref.allocation;
  if (!alloc) {
    // Walk-in / no-allocation guests can't refer because there's no cap context.
    return { error: "Referrals are only available on hosted lists." };
  }
  if (!alloc.list_open) return { error: "List is closed." };

  // Enforce cap server-side.
  const { data: existing } = await admin
    .from("guests")
    .select("plus_ones, status")
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);
  const used = (existing ?? []).reduce(
    (s, g) => s + 1 + (g.plus_ones ?? 0),
    0
  );
  const requestedPlusOnes = alloc.plus_ones_allowed
    ? Math.max(0, parseInt(plusOnesStr ?? "0", 10) || 0)
    : 0;
  const requestedTotal = 1 + requestedPlusOnes;
  if (used + requestedTotal > alloc.cap) {
    return { error: `Over cap (${used}/${alloc.cap}).` };
  }

  const status = alloc.auto_approve ? "approved" : "pending";

  const { error } = await admin.from("guests").insert({
    event_night_id: ref.event_night_id,
    allocation_id: alloc.id,
    full_name: fullName,
    plus_ones: requestedPlusOnes,
    status,
    referred_by_guest_id: referrerId,
  });
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_allocation_id: alloc.id,
    action: "referral.add_guest",
    entity_type: "guest",
    event_id: ref.night.event.id,
    context: {
      referrer_id: referrerId,
      referrer_name: ref.full_name,
      full_name: fullName,
      plus_ones: requestedPlusOnes,
      status,
    },
  });

  await notify(ref.night.event.account_id, "referral_arrived", {
    message: `${ref.full_name} brought ${fullName} (${ref.night.event.name})`,
    href: `/owner/events/${ref.night.event.id}/queue`,
    event_id: ref.night.event.id,
    event_name: ref.night.event.name,
  });

  revalidatePath(`/referral/${referrerId}`);
  return { ok: true as const };
}
