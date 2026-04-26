import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Twilio Status Callback webhook (Day 25).
 *
 * Twilio POSTs message lifecycle updates after the initial send:
 *   queued → sending → sent → (delivered | undelivered | failed)
 *
 * Configure on Twilio: Phone Numbers → Active Numbers → Status Callback URL
 *   https://wadl-pearl.vercel.app/api/webhooks/twilio/sms/status   (POST)
 * OR pass StatusCallback per-message in lib/sms.ts (we don't today).
 *
 * Body fields we use: MessageSid, MessageStatus, ErrorCode, To, From.
 *
 * We update the sms_log row keyed by provider_sid = MessageSid so the
 * /owner/sms-log view shows real delivered/failed pills instead of
 * stuck-on-"sent".
 */

// ErrorCode → human description for the few we'll see most often.
// Full list: https://www.twilio.com/docs/api/errors
const ERROR_CODES: Record<string, string> = {
  "30003": "Unreachable destination handset",
  "30004": "Message blocked by carrier",
  "30005": "Unknown destination handset",
  "30006": "Landline / unreachable carrier",
  "30007": "Carrier filtered as spam",
  "30008": "Unknown error",
  "21610": "Recipient has opted out",
};

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const sorted = Object.keys(params).sort();
  const concatenated = url + sorted.map((k) => k + (params[k] ?? "")).join("");
  const expected = crypto.createHmac("sha1", authToken).update(concatenated).digest("base64");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";

  const formText = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(formText).entries()) {
    params[k] = v;
  }

  if (authToken) {
    if (!signature) return new NextResponse("missing signature", { status: 403 });
    const url = `${getAppUrl()}/api/webhooks/twilio/sms/status`;
    if (!validateTwilioSignature(authToken, signature, url, params)) {
      return new NextResponse("invalid signature", { status: 403 });
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[twilio-status-webhook] TWILIO_AUTH_TOKEN not set — skipping signature validation (dev only)"
    );
  }

  const sid = params.MessageSid;
  const status = params.MessageStatus;
  const errorCode = params.ErrorCode || null;
  if (!sid || !status) {
    return new NextResponse("ok", { status: 200 });
  }

  const admin = createAdminClient();

  // Map Twilio status → sms_log.status keep-or-overwrite policy:
  // - "delivered" / "failed" / "undelivered" are terminal — we always overwrite.
  // - "sent" / "queued" / "sending" only overwrite if we don't already have a terminal one.
  const TERMINAL = new Set(["delivered", "failed", "undelivered"]);
  const update: Record<string, unknown> = {
    twilio_status: status,
    twilio_error_code: errorCode,
    status_updated_at: new Date().toISOString(),
  };

  if (TERMINAL.has(status)) {
    update.status = status;
    if (errorCode) {
      update.error = ERROR_CODES[errorCode]
        ? `${errorCode}: ${ERROR_CODES[errorCode]}`
        : `Twilio error ${errorCode}`;
    }
  }

  const { error: upErr } = await admin
    .from("sms_log")
    .update(update)
    .eq("provider_sid", sid);

  if (upErr) {
    // eslint-disable-next-line no-console
    console.warn("[twilio-status-webhook] sms_log update failed", upErr.message);
  }

  return new NextResponse("", { status: 200, headers: { "Content-Type": "text/xml" } });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "twilio-sms-status" });
}
