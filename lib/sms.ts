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

import { isDevMode } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendSmsInput {
  to: string;
  body: string;
  /** When true, skip the opt-out check (used by service messages like OTP). */
  skipOptOutCheck?: boolean;
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

export async function sendSms({
  to,
  body,
  skipOptOutCheck,
}: SendSmsInput): Promise<SendSmsResult> {
  if (!skipOptOutCheck && (await isOptedOut(to))) {
    // eslint-disable-next-line no-console
    console.log(`[SMS:opted-out] → ${to} — skipping send`);
    return { ok: false, error: "opted_out", phone: to };
  }

  if (isDevMode()) {
    // eslint-disable-next-line no-console
    console.log(
      `[SMS:dev] → ${to}\n${body}\n(set DEV_MODE=false + fill Twilio env to send real SMS)`
    );
    return { ok: true, provider: "dev" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const msgService = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!sid || !token || (!from && !msgService)) {
    return {
      ok: false,
      error:
        "Twilio env not configured. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / (TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID).",
    };
  }

  const params = new URLSearchParams({ To: to, Body: body });
  if (msgService) params.set("MessagingServiceSid", msgService);
  else if (from) params.set("From", from);

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
    return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` };
  }
  const data = (await res.json()) as { sid?: string };
  return { ok: true, provider: "twilio", sid: data.sid };
}
