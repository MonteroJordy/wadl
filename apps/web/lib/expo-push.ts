/**
 * Expo Push API client. SERVER-ONLY.
 *
 * No SDK — Expo's push HTTP API is a single POST. We batch up to 100
 * messages per request as their docs recommend, and prune `DeviceNotRegistered`
 * tokens from user_devices on receipt.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string; expoPushToken?: string };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPushBatch(
  messages: ExpoPushMessage[]
): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];
  const tickets: ExpoTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json()) as { data?: ExpoTicket[] };
      tickets.push(...(json.data ?? []));
    } catch {
      // ignore network errors on this chunk; soft failure
    }
  }
  return tickets;
}

interface SendToAccountInput {
  accountId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Fan out an Expo push to every user_devices row owned by users in this
 * account. Drops tokens whose tickets come back DeviceNotRegistered.
 */
export async function sendExpoPushToAccount(
  input: SendToAccountInput
): Promise<{ sent: number; dropped: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("user_devices")
    .select(
      "id, expo_push_token, user:profiles!inner(account_id)"
    )
    .eq("user.account_id", input.accountId)
    .not("expo_push_token", "is", null);

  const devices = (rows ?? []) as unknown as Array<{
    id: string;
    expo_push_token: string;
  }>;
  if (devices.length === 0) return { sent: 0, dropped: 0 };

  const messages: ExpoPushMessage[] = devices.map((d) => ({
    to: d.expo_push_token,
    title: input.title,
    body: input.body,
    sound: "default",
    channelId: "default",
    data: input.url ? { url: input.url, tag: input.tag } : undefined,
  }));

  const tickets = await sendExpoPushBatch(messages);

  // Drop unregistered tokens.
  let dropped = 0;
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (
      t?.status === "error" &&
      (t.details?.error === "DeviceNotRegistered" ||
        t.message?.includes("DeviceNotRegistered"))
    ) {
      const dev = devices[i];
      if (dev) {
        await admin.from("user_devices").delete().eq("id", dev.id);
        dropped++;
      }
    }
  }
  const sent = tickets.filter((t) => t?.status === "ok").length;
  return { sent, dropped };
}
