/**
 * Thin SMS abstraction. SERVER-ONLY.
 *
 * DEV_MODE behavior:
 *   - If `DEV_MODE=true` in env, or if `NEXT_PUBLIC_APP_URL` points at
 *     localhost, the payload is console.logged and nothing is sent.
 *   - Otherwise, POSTs to Twilio's REST API with the credentials in
 *     TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / (TWILIO_MESSAGING_SERVICE_SID
 *     or TWILIO_FROM_NUMBER).
 *
 * To flip live:
 *   1. Fill in the Twilio vars in `.env.local`.
 *   2. Set `DEV_MODE=false`.
 *   3. Deploy (or restart `next dev`). No code change.
 */

export interface SendSmsInput {
  to: string;
  body: string;
}

export type SendSmsResult =
  | { ok: true; provider: "dev" | "twilio"; sid?: string }
  | { ok: false; error: string };

function isDevMode(): boolean {
  const explicit = process.env.DEV_MODE;
  if (explicit !== undefined) return explicit.toLowerCase() !== "false";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

export async function sendSms({ to, body }: SendSmsInput): Promise<SendSmsResult> {
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
