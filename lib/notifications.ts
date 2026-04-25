import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationKind =
  | "rsvp_pending"
  | "capacity_alert"
  | "staff_assigned"
  | "billing_event"
  | "co_owner_accepted"
  | "scan_failure_high"
  | "waitlist_promoted"
  | "referral_arrived"
  | "guest_flagged"
  | "tier_upgraded"
  | "broadcast_sent";

export interface NotificationPayload {
  [key: string]: unknown;
  message?: string;
  href?: string;
  event_id?: string;
  event_name?: string;
}

/**
 * Insert a notification for an account. Server-only.
 * Soft-fails on error so non-critical notifs never block their callers.
 */
export async function notify(
  accountId: string,
  kind: NotificationKind,
  payload: NotificationPayload
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from("notifications")
      .insert({ account_id: accountId, kind, payload });
  } catch {
    // best-effort
  }
}

export const KIND_LABEL: Record<NotificationKind, string> = {
  rsvp_pending: "RSVP awaiting review",
  capacity_alert: "Capacity alert",
  staff_assigned: "Staff assigned",
  billing_event: "Billing update",
  co_owner_accepted: "Co-owner accepted",
  scan_failure_high: "High scan failure rate",
  waitlist_promoted: "Waitlist promoted",
  referral_arrived: "New referral",
  guest_flagged: "Guest flagged",
  tier_upgraded: "Tier upgraded",
  broadcast_sent: "Broadcast sent",
};

export const KIND_TONE: Record<NotificationKind, "coral" | "gold" | "mint"> = {
  rsvp_pending: "gold",
  capacity_alert: "coral",
  staff_assigned: "mint",
  billing_event: "mint",
  co_owner_accepted: "mint",
  scan_failure_high: "coral",
  waitlist_promoted: "mint",
  referral_arrived: "coral",
  guest_flagged: "coral",
  tier_upgraded: "mint",
  broadcast_sent: "mint",
};
