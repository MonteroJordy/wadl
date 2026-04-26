import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccount } from "@/lib/push";
import { sendExpoPushToAccount } from "@/lib/expo-push";
import { getAppUrl } from "@/lib/app-url";
export {
  KIND_LABEL,
  KIND_TONE,
  type NotificationKind,
  type NotificationPayload,
} from "@/lib/notification-kinds";
import { KIND_LABEL, type NotificationKind, type NotificationPayload } from "@/lib/notification-kinds";

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

