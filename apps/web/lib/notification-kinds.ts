/**
 * Client-safe notification kind enum + labels.
 *
 * lib/notifications.ts (server) re-exports these and adds the server-side
 * `notify()` helper that pulls in push + Supabase. Keeping the type/label
 * surface in its own module means client components can import it without
 * dragging node:crypto into the browser bundle.
 */

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
  | "broadcast_sent"
  | "door_escalation";

export interface NotificationPayload {
  [key: string]: unknown;
  message?: string;
  href?: string;
  event_id?: string;
  event_name?: string;
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
  door_escalation: "Door needs you",
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
  door_escalation: "coral",
};
