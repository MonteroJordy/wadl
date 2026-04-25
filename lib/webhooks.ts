import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEventName =
  | "rsvp.created"
  | "guest.checked_in"
  | "allocation.full"
  | "guest.flagged"
  | "broadcast.sent"
  | "event.created";

export interface WebhookPayload {
  event: WebhookEventName;
  account_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

/**
 * Enqueue a webhook delivery for every active endpoint subscribed to this
 * event for this account. Best-effort — we don't block the caller on POST
 * latency, just record a row that the worker (or our retry loop on attempt())
 * picks up.
 */
export async function enqueueWebhook(
  accountId: string,
  event: WebhookEventName,
  data: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { data: endpoints } = await admin
    .from("webhook_endpoints")
    .select("id, events")
    .eq("account_id", accountId)
    .eq("active", true);

  const matching = ((endpoints ?? []) as Array<{ id: string; events: string }>).filter(
    (e) => e.events === "*" || e.events.split(",").map((s) => s.trim()).includes(event)
  );
  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    account_id: accountId,
    data,
    created_at: new Date().toISOString(),
  };

  const rows = matching.map((e) => ({
    endpoint_id: e.id,
    event_name: event,
    payload: payload as unknown as Record<string, unknown>,
    next_attempt_at: new Date().toISOString(),
  }));
  await admin.from("webhook_deliveries").insert(rows);

  // Fire-and-forget the first attempts so callers see no added latency.
  void deliverPending();
}

/**
 * Process pending webhook deliveries. Backoff: 1m, 5m, 30m, 2h, 12h.
 * Caller can be a cron OR a fire-and-forget after enqueue (best-effort).
 */
export async function deliverPending(): Promise<void> {
  const admin = createAdminClient();
  const { data: due } = await admin
    .from("webhook_deliveries")
    .select(
      "id, endpoint_id, event_name, payload, attempt, endpoint:webhook_endpoints!inner(url, secret, active)"
    )
    .is("delivered_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempt", 5)
    .limit(20);

  for (const row of (due ?? []) as unknown as Array<{
    id: string;
    endpoint_id: string;
    event_name: string;
    payload: Record<string, unknown>;
    attempt: number;
    endpoint: { url: string; secret: string; active: boolean };
  }>) {
    if (!row.endpoint.active) continue;
    const body = JSON.stringify(row.payload);
    const sig = crypto
      .createHmac("sha256", row.endpoint.secret)
      .update(body)
      .digest("hex");

    let status = 0;
    let err: string | null = null;
    try {
      const res = await fetch(row.endpoint.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wadl-signature": `sha256=${sig}`,
          "x-wadl-event": row.event_name,
        },
        body,
      });
      status = res.status;
      if (!res.ok) err = `HTTP ${res.status}`;
    } catch (e) {
      err = (e as Error).message;
    }

    if (!err) {
      await admin
        .from("webhook_deliveries")
        .update({
          status_code: status,
          delivered_at: new Date().toISOString(),
          attempt: row.attempt + 1,
        })
        .eq("id", row.id);
    } else {
      const backoffMs = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000][
        Math.min(row.attempt, 4)
      ];
      await admin
        .from("webhook_deliveries")
        .update({
          status_code: status,
          attempt: row.attempt + 1,
          last_error: err.slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq("id", row.id);
    }
  }
}
