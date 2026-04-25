import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
}

/**
 * Google Wallet "save to wallet" link.
 *
 * Google Wallet works by:
 *  1. Creating a Generic / Event Ticket Class once on your issuer account.
 *  2. Per pass, signing a JWT containing the GenericObject definition.
 *  3. Redirecting the user to https://pay.google.com/gp/v/save/{jwt}
 *
 * We support graceful degradation when GOOGLE_WALLET_ISSUER_ID and
 * GOOGLE_WALLET_SERVICE_ACCOUNT_KEY are not set: returns a friendly JSON
 * stub instead of a broken redirect.
 *
 * SERVICE_ACCOUNT_KEY should be the JSON-stringified contents of the
 * service account credentials file.
 */
function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: object, key: GoogleServiceAccountKey): string {
  const header = { alg: "RS256", typ: "JWT", kid: key.client_email };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const sig = signer.sign(key.private_key);
  return `${signingInput}.${base64url(sig)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const keyJson = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;

  if (!issuerId || !keyJson) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Google Wallet isn't configured on this deployment. Set GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT_KEY (JSON-stringified service account credentials) to enable.",
      },
      { status: 503 }
    );
  }

  let key: GoogleServiceAccountKey;
  try {
    key = JSON.parse(keyJson) as GoogleServiceAccountKey;
  } catch {
    return NextResponse.json(
      { ok: false, message: "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY is not valid JSON." },
      { status: 500 }
    );
  }
  if (!key.client_email || !key.private_key) {
    return NextResponse.json(
      { ok: false, message: "Service account JSON is missing client_email or private_key." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, tier, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(name))"
    )
    .eq("check_in_token", params.token)
    .maybeSingle<{
      id: string;
      full_name: string;
      plus_ones: number;
      status: string;
      tier: string;
      check_in_token: string;
      night: {
        night_date: string;
        doors_at: string;
        event: { name: string };
      };
    }>();

  if (!guest) {
    return NextResponse.json(
      { ok: false, message: "Ticket not found" },
      { status: 404 }
    );
  }

  const classId = `${issuerId}.wadl_event_ticket`;
  const objectId = `${issuerId}.${guest.check_in_token}`;
  const ticketUrl = `${getAppUrl()}/t/${guest.check_in_token}`;

  const ticketObject = {
    id: objectId,
    classId,
    state: guest.status === "approved" ? "ACTIVE" : "INACTIVE",
    eventName: { defaultValue: { language: "en-US", value: guest.night.event.name } },
    ticketHolderName: guest.full_name,
    ticketNumber: guest.check_in_token,
    barcode: { type: "QR_CODE", value: guest.check_in_token },
    dateTime: { start: guest.night.doors_at },
    linksModuleData: {
      uris: [{ uri: ticketUrl, description: "View ticket" }],
    },
  };

  const payload = {
    iss: key.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: { eventTicketObjects: [ticketObject] },
  };

  let token: string;
  try {
    token = signJwt(payload, key);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: `JWT signing failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  const url = `https://pay.google.com/gp/v/save/${token}`;
  return NextResponse.redirect(url, 302);
}
