import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Twilio inbound-SMS webhook (Day 19 P1-5).
 *
 * Twilio POSTs application/x-www-form-urlencoded with `From`, `Body`,
 * `MessageSid`, etc. We honor TCPA STOP / START / UNSTOP verbs:
 *  - STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT  → mark opted-out
 *  - START / UNSTOP / YES                                → clear opted-out
 *
 * Twilio handles the auto-reply ("You've been unsubscribed…") on its end
 * for STOP+START keywords, so we don't need to TwiML respond. We return an
 * empty 200.
 *
 * Configure on Twilio: Phone Numbers → Active Numbers → A MESSAGE COMES IN
 *   webhook URL: https://wadl-pearl.vercel.app/api/webhooks/twilio/sms
 *   method: POST
 *
 * Signature validation (HMAC-SHA1 over URL + sorted params) requires
 * TWILIO_AUTH_TOKEN. If missing, we accept the POST in dev but log a
 * warning. In prod we 403 unsigned requests.
 */

const STOP_KEYWORDS = new Set([
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
]);
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const sorted = Object.keys(params).sort();
  const concatenated =
    url + sorted.map((k) => k + (params[k] ?? "")).join("");
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(concatenated)
    .digest("base64");
  // timingSafeEqual requires equal-length buffers — bail before then.
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature") ?? "";

  // Read body as form-urlencoded.
  const formText = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(formText).entries()) {
    params[k] = v;
  }

  // Signature validation. Skip in dev when no token configured.
  if (authToken) {
    if (!signature) {
      return new NextResponse("missing signature", { status: 403 });
    }
    // Twilio signs against the EXACT URL it called — include query string
    // if any. We reconstruct from the request URL.
    const url = `${getAppUrl()}/api/webhooks/twilio/sms`;
    if (!validateTwilioSignature(authToken, signature, url, params)) {
      return new NextResponse("invalid signature", { status: 403 });
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[twilio-webhook] TWILIO_AUTH_TOKEN not set — skipping signature validation (dev only)"
    );
  }

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim().toUpperCase();
  if (!from || !body) {
    return new NextResponse("ok", { status: 200 });
  }

  // First-token verb match. "STOP PLEASE" still matches.
  const verb = body.split(/\s+/)[0];
  const admin = createAdminClient();

  if (STOP_KEYWORDS.has(verb)) {
    const nowIso = new Date().toISOString();
    // Mark every guest row with this phone as opted-out.
    await admin
      .from("guests")
      .update({ sms_opted_out: true, sms_opted_out_at: nowIso })
      .eq("phone", from);

    // Audit (no event scope — phone-level event).
    await admin.from("audit_log").insert({
      action: "sms.opted_out",
      entity_type: "phone",
      context: { phone: from, via: "twilio_inbound", message_sid: params.MessageSid ?? null },
    });
  } else if (START_KEYWORDS.has(verb)) {
    await admin
      .from("guests")
      .update({ sms_opted_out: false, sms_opted_out_at: null })
      .eq("phone", from);

    await admin.from("audit_log").insert({
      action: "sms.opted_in",
      entity_type: "phone",
      context: { phone: from, via: "twilio_inbound", message_sid: params.MessageSid ?? null },
    });
  }
  // Other inbound messages: log + ignore. No two-way SMS support yet.

  // Empty 200 — Twilio's auto-reply handles the user-facing confirmation
  // for STOP/START keywords.
  return new NextResponse("", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// Support GET as a Twilio sanity check (some operators use GET to verify
// the URL is reachable; respond 200 OK).
export async function GET() {
  return NextResponse.json({ ok: true, route: "twilio-inbound-sms" });
}
