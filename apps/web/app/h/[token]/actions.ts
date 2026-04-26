"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { enqueueWebhook } from "@/lib/webhooks";
import { hit, LIMITS } from "@/lib/rate-limit";
import { checkAndLockdown } from "@/lib/lockdown";

interface TokenLookup {
  token: string;
  allocation_id: string;
  revoked_at: string | null;
  expires_at: string | null;
  allocation: {
    id: string;
    event_night_id: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
}

async function resolveToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("allocation_tokens")
    .select(
      "token, allocation_id, revoked_at, expires_at, allocation:allocations!inner(id, event_night_id, cap, auto_approve, list_open, plus_ones_allowed)"
    )
    .eq("token", token)
    .maybeSingle<TokenLookup>();
  if (!data) return { error: "This link is no longer valid." };
  if (data.revoked_at) return { error: "This link has been rotated." };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "This link has expired." };
  }
  return { data };
}

export async function addHolderGuestAction(token: string, formData: FormData) {
  const fullName = (formData.get("full_name") as string | null)?.trim();
  const plusOnesStr = formData.get("plus_ones") as string | null;
  if (!fullName) return { error: "Enter a name." };

  const limit = hit(`holder:${token}`, LIMITS.holderAddPerToken);
  if (!limit.ok) {
    return { error: `Slow down — try again in ${limit.retryAfterSec}s.` };
  }

  const lookup = await resolveToken(token);
  if ("error" in lookup) return { error: lookup.error };
  const { allocation } = lookup.data;

  if (!allocation.list_open) {
    return { error: "This list is closed." };
  }

  const admin = createAdminClient();

  // Enforce cap server-side.
  const { data: existing } = await admin
    .from("guests")
    .select("plus_ones, status")
    .eq("allocation_id", allocation.id)
    .in("status", ["approved", "pending"]);
  const used = (existing ?? []).reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0
  );
  const requestedPlusOnes = allocation.plus_ones_allowed
    ? Math.max(0, parseInt(plusOnesStr ?? "0", 10) || 0)
    : 0;
  const requestedTotal = 1 + requestedPlusOnes;
  if (used + requestedTotal > allocation.cap) {
    return { error: `Over cap (${used}/${allocation.cap} used).` };
  }

  const status = allocation.auto_approve ? "approved" : "pending";

  const { error } = await admin.from("guests").insert({
    event_night_id: allocation.event_night_id,
    allocation_id: allocation.id,
    full_name: fullName,
    plus_ones: requestedPlusOnes,
    status,
  });

  if (error) return { error: error.message };

  // Look up event_id + account_id so the audit row + notification can be scoped.
  const { data: nightRow } = await admin
    .from("event_nights")
    .select("event_id, event:events!inner(id, name, account_id)")
    .eq("id", allocation.event_night_id)
    .maybeSingle<{
      event_id: string;
      event: { id: string; name: string; account_id: string };
    }>();

  // Audit: who added this? Holders have no user ID; record via
  // actor_allocation_id so the action is attributed to the holder allocation.
  await admin.from("audit_log").insert({
    actor_allocation_id: allocation.id,
    action: "holder.add_guest",
    entity_type: "guest",
    event_id: nightRow?.event_id ?? null,
    context: { full_name: fullName, plus_ones: requestedPlusOnes, status },
  });

  if (nightRow?.event && status === "pending") {
    await notify(nightRow.event.account_id, "rsvp_pending", {
      message: `${fullName} added by holder, awaiting review (${nightRow.event.name})`,
      href: `/owner/events/${nightRow.event.id}/queue`,
      event_id: nightRow.event.id,
      event_name: nightRow.event.name,
    });
  }

  // Capacity alert at 90% of cap.
  const newUsed = used + requestedTotal;
  if (allocation.cap > 0 && newUsed >= Math.floor(allocation.cap * 0.9) && nightRow?.event) {
    await notify(nightRow.event.account_id, "capacity_alert", {
      message: `Allocation hit ${Math.round((newUsed / allocation.cap) * 100)}% (${newUsed}/${allocation.cap}) on ${nightRow.event.name}`,
      href: `/owner/events/${nightRow.event.id}`,
      event_id: nightRow.event.id,
    });
  }

  if (nightRow?.event) {
    await enqueueWebhook(nightRow.event.account_id, "rsvp.created", {
      event_id: nightRow.event.id,
      allocation_id: allocation.id,
      full_name: fullName,
      plus_ones: requestedPlusOnes,
      status,
    });
    if (allocation.cap > 0 && newUsed >= allocation.cap) {
      await enqueueWebhook(nightRow.event.account_id, "allocation.full", {
        event_id: nightRow.event.id,
        allocation_id: allocation.id,
        cap: allocation.cap,
      });
    }

    // Check capacity-lockdown threshold for the night.
    if (status === "approved") {
      const { data: nightCapRow } = await admin
        .from("event_nights")
        .select("capacity_cap, lockdown_threshold_pct")
        .eq("id", allocation.event_night_id)
        .maybeSingle<{
          capacity_cap: number | null;
          lockdown_threshold_pct: number;
        }>();
      if (nightCapRow?.capacity_cap) {
        const { data: nightApproved } = await admin
          .from("guests")
          .select("plus_ones")
          .eq("event_night_id", allocation.event_night_id)
          .eq("status", "approved");
        const totalApproved = ((nightApproved ?? []) as Array<{ plus_ones: number }>)
          .reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);
        await checkAndLockdown({
          nightId: allocation.event_night_id,
          eventId: nightRow.event.id,
          accountId: nightRow.event.account_id,
          eventName: nightRow.event.name,
          capacityCap: nightCapRow.capacity_cap,
          thresholdPct: nightCapRow.lockdown_threshold_pct,
          approvedHeads: totalApproved,
        });
      }
    }
  }

  revalidatePath(`/h/${token}`);
  return { ok: true as const };
}
