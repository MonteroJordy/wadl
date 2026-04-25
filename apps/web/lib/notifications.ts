import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccount } from "@/lib/push";
import { sendExpoPushToAccount } from "@/lib/expo-push";
import { getAppUrl } from "@/lib/app-url";

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
 * Insert a notification for an account + send a web push (if VAPID configured
 * and the user has subscribed). Server-only. Soft-fails on error so non-critical
 * notifs never block their callers.
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

  // Fire-and-forget push to BOTH web push subs AND Expo push tokens.
  // Each helper no-ops gracefully when its config / subscribers aren't
  // present — VAPID-less web stays silent; mobile-less accounts stay silent.
  try {
    const title =
      (payload.message as string | undefined)?.split(".")[0]?.slice(0, 80) ??
      KIND_LABEL[kind];
    const url = (payload.href as string | undefined)
      ? `${getAppUrl()}${payload.href}`
      : `${getAppUrl()}/owner/notifications`;
    const heading = `WADL: ${KIND_LABEL[kind] ?? kind}`;
    await Promise.all([
      sendPushToAccount(accountId, {
        title: heading,
        body: title,
        url,
        tag: kind,
      }),
      sendExpoPushToAccount({
        accountId,
        title: heading,
        body: title,
        url,
        tag: kind,
      }),
    ]);
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
