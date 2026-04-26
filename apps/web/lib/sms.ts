/**
 * Thin SMS abstraction. SERVER-ONLY.
 *
 * DEV_MODE behavior is centralized in lib/app-url.ts (auto-detect from
 * NEXT_PUBLIC_APP_URL: https → real Twilio, anything else → console).
 * Set DEV_MODE=false explicitly to override auto-detect (e.g. test real
 * SMS while running off a non-https tunnel).
 *
 * Twilio path requires:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either
 *   TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.
 */

import { isDevMode, getAppUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendSmsInput {
  to: string;
  body: string;
  /** When true, skip the opt-out check (used by service messages like OTP). */
  skipOptOutCheck?: boolean;
  /** Optional metadata for the sms_log row written after each send. */
  log?: {
    account_id?: string;
    event_id?: string;
    guest_id?: string;
    template_key?: string;
    sent_by?: string;
  };
}

export type SendSmsResult =
  | { ok: true; provider: "dev" | "twilio"; sid?: string }
  | { ok: false; error: string }
  | { ok: false; error: "opted_out"; phone: string };

/**
 * Honor TCPA opt-outs by short-circuiting when the recipient phone has any
 * guest row marked sms_opted_out. Best-effort: a DB error here does NOT block
 * the send (we'd rather over-send than swallow a critical message).
 */
async function isOptedOut(phone: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("guests")
      .select("id")
      .eq("phone", phone)
      .eq("sms_opted_out", true)
      .limit(1);
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

async function logSms(
  to: string,
  body: string,
  provider: "dev" | "twilio",
  status: string,
  meta: SendSmsInput["log"],
  sid: string | null,
  err: string | null
) {
  if (!meta) return;
  try {
    const admin = createAdminClient();
    await admin.from("sms_log").insert({
      account_id: meta.account_id ?? null,
      event_id: meta.event_id ?? null,
      guest_id: meta.guest_id ?? null,
      to_phone: to,
      body: body.slice(0, 1600),
      template_key: meta.template_key ?? null,
      provider,
      provider_sid: sid,
      status,
      error: err,
      segments: Math.max(1, Math.ceil(body.length / 160)),
      cost_estimate_usd: 0.008 * Math.max(1, Math.ceil(body.length / 160)),
      sent_by: meta.sent_by ?? null,
    });
  } catch {
    /* best-effort */
  }
}

export async function sendSms({
  to,
  body,
  skipOptOutCheck,
  log,
}: SendSmsInput): Promise<SendSmsResult> {
  if (!skipOptOutCheck && (await isOptedOut(to))) {
    // eslint-disable-next-line no-console
    console.log(`[SMS:opted-out] → ${to} — skipping send`);
    await logSms(to, body, "dev", "opted_out", log, null, "opted_out");
    return { ok: false, error: "opted_out", phone: to };
  }

  if (isDevMode()) {
    // eslint-disable-next-line no-console
    console.log(
      `[SMS:dev] → ${to}\n${body}\n(set DEV_MODE=false + fill Twilio env to send real SMS)`
    );
    await logSms(to, body, "dev", "sent", log, null, null);
    return { ok: true, provider: "dev" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const msgService = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!sid || !token || (!from && !msgService)) {
    const err =
      "Twilio env not configured. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / (TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID).";
    await logSms(to, body, "twilio", "config_error", log, null, err);
    return { ok: false, error: err };
  }

  const params = new URLSearchParams({ To: to, Body: body });
  if (msgService) params.set("MessagingServiceSid", msgService);
  else if (from) params.set("From", from);
  // Day 25: ask Twilio to call us back with delivered/failed status. The
  // /api/webhooks/twilio/sms/status route updates the sms_log row keyed by
  // MessageSid. Skipped on non-https URLs (Twilio requires public HTTPS).
  try {
    const appUrl = getAppUrl();
    if (appUrl.startsWith("https://")) {
      params.set("StatusCallback", `${appUrl}/api/webhooks/twilio/sms/status`);
    }
  } catch {
    /* NEXT_PUBLIC_APP_URL not set — skip callback */
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = `Twilio ${res.status}: ${text.slice(0, 200)}`;
    await logSms(to, body, "twilio", `error_${res.status}`, log, null, err);
    return { ok: false, error: err };
  }
  const data = (await res.json()) as { sid?: string };
  await logSms(to, body, "twilio", "sent", log, data.sid ?? null, null);
  return { ok: true, provider: "twilio", sid: data.sid };
}
