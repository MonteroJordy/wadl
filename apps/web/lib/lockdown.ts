import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

interface NightAggInput {
  nightId: string;
  eventId: string;
  accountId: string;
  eventName: string;
  capacityCap: number;
  thresholdPct: number;
  approvedHeads: number;
}

/**
 * Capacity lockdown check. Call after every guest mutation that could push
 * approved heads over the night's lockdown threshold. When triggered:
 *  - Sets event_nights.is_frozen = true (so /h/[token] forms close).
 *  - Closes every allocation's list_open on the night.
 *  - Audit-logs the lockdown.
 *  - Fires a capacity_alert notification.
 *
 * Idempotent: skipping the writes when the night is already frozen.
 */
export async function checkAndLockdown(input: NightAggInput): Promise<boolean> {
  const { capacityCap, thresholdPct, approvedHeads } = input;
  if (capacityCap <= 0 || thresholdPct <= 0) return false;
  const trigger = Math.floor(capacityCap * (thresholdPct / 100));
  if (approvedHeads < trigger) return false;

  const admin = createAdminClient();
  const { data: night } = await admin
    .from("event_nights")
    .select("id, is_frozen")
    .eq("id", input.nightId)
    .maybeSingle<{ id: string; is_frozen: boolean }>();
  if (!night) return false;
  if (night.is_frozen) return false; // already locked

  await admin
    .from("event_nights")
    .update({ is_frozen: true })
    .eq("id", input.nightId);

  await admin
    .from("allocations")
    .update({ list_open: false })
    .eq("event_night_id", input.nightId);

  await admin.from("audit_log").insert({
    action: "capacity.lockdown",
    entity_type: "event_night",
    entity_id: input.nightId,
    event_id: input.eventId,
    context: {
      capacity_cap: capacityCap,
      threshold_pct: thresholdPct,
      approved_heads: approvedHeads,
    },
  });

  await notify(input.accountId, "capacity_alert", {
    message: `Lockdown — ${input.eventName} hit ${thresholdPct}% capacity (${approvedHeads}/${capacityCap}). All lists closed.`,
    href: `/owner/events/${input.eventId}`,
    event_id: input.eventId,
    event_name: input.eventName,
  });

  return true;
}
