import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Stripe Connect events webhook (Day 25).
 *
 * Receives Stripe events (account.updated, account.application.deauthorized,
 * payout.paid, transfer.created) and keeps connect_accounts in sync.
 *
 * Configure: Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   URL: https://wadl-pearl.vercel.app/api/webhooks/stripe/connect
 *   Events: account.updated, account.application.deauthorized,
 *           payout.paid, transfer.created
 *   Mode: Connect (not Account)
 *
 * Required env: STRIPE_CONNECT_WEBHOOK_SECRET (whsec_…).
 *
 * If the secret is unset we accept the POST in dev with a warning, but in
 * any context where the secret IS set we hard-validate the signature.
 */

interface StripeAccountObject {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string | null;
  email: string | null;
  country: string | null;
  metadata: Record<string, string> | null;
}

interface StripeEvent {
  id: string;
  type: string;
  account?: string; // present on Connect events
  data: { object: StripeAccountObject | Record<string, unknown> };
}

/**
 * Stripe webhook signature is t=<timestamp>,v1=<sig>.
 * sig = HMAC-SHA256(payload = "<timestamp>.<rawBody>", key = secret).
 * Reject if timestamp drift > 5 min.
 */
function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): { ok: true } | { ok: false; reason: string } {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return { ok: false, reason: "malformed signature" };

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "non-numeric timestamp" };
  const drift = Math.abs(Date.now() / 1000 - tsNum);
  if (drift > 300) return { ok: false, reason: "timestamp drift > 5min" };

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (expected.length !== v1.length) return { ok: false, reason: "length mismatch" };
  const equal = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  return equal ? { ok: true } : { ok: false, reason: "hmac mismatch" };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  if (secret) {
    if (!signature) return new NextResponse("missing signature", { status: 403 });
    const v = verifyStripeSignature(rawBody, signature, secret);
    if (!v.ok) {
      // eslint-disable-next-line no-console
      console.warn("[stripe-connect-webhook] signature invalid:", v.reason);
      return new NextResponse("invalid signature", { status: 403 });
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[stripe-connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET not set — skipping verification (dev only)"
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "account.updated": {
      const acct = event.data.object as StripeAccountObject;
      // Find the WADL account by metadata.account_id (set during OAuth) or
      // by stripe_account_id pointer on accounts table.
      const wadlAccountId =
        acct.metadata?.wadl_account_id ?? null;

      if (wadlAccountId) {
        await admin
          .from("connect_accounts")
          .upsert(
            {
              account_id: wadlAccountId,
              stripe_account_id: acct.id,
              charges_enabled: acct.charges_enabled,
              payouts_enabled: acct.payouts_enabled,
              details_submitted: acct.details_submitted,
              default_currency: acct.default_currency,
              email: acct.email,
              country: acct.country,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_account_id" }
          );

        // Maintain the denormalized pointer.
        await admin
          .from("accounts")
          .update({ stripe_connect_account_id: acct.id })
          .eq("id", wadlAccountId);

        await admin.from("audit_log").insert({
          action: "stripe.connect.account_updated",
          entity_type: "account",
          entity_id: wadlAccountId,
          context: {
            stripe_account_id: acct.id,
            charges_enabled: acct.charges_enabled,
            payouts_enabled: acct.payouts_enabled,
          },
        });
      } else {
        // Fall back to upsert keyed by stripe_account_id only — connect_accounts
        // row will be unanchored until the OAuth callback runs and links it.
        await admin
          .from("connect_accounts")
          .update({
            charges_enabled: acct.charges_enabled,
            payouts_enabled: acct.payouts_enabled,
            details_submitted: acct.details_submitted,
            default_currency: acct.default_currency,
            email: acct.email,
            country: acct.country,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", acct.id);
      }
      break;
    }

    case "account.application.deauthorized": {
      // Connected account uninstalled the WADL platform → wipe the row.
      const stripeAcctId = event.account ?? "";
      if (stripeAcctId) {
        const { data: row } = await admin
          .from("connect_accounts")
          .select("account_id")
          .eq("stripe_account_id", stripeAcctId)
          .maybeSingle<{ account_id: string }>();
        if (row?.account_id) {
          await admin
            .from("accounts")
            .update({ stripe_connect_account_id: null })
            .eq("id", row.account_id);
          await admin.from("audit_log").insert({
            action: "stripe.connect.deauthorized",
            entity_type: "account",
            entity_id: row.account_id,
            context: { stripe_account_id: stripeAcctId },
          });
        }
        await admin
          .from("connect_accounts")
          .delete()
          .eq("stripe_account_id", stripeAcctId);
      }
      break;
    }

    case "payout.paid":
    case "transfer.created": {
      // Just audit-log; full payout reconciliation lives in payout-detail UI.
      await admin.from("audit_log").insert({
        action: `stripe.${event.type}`,
        entity_type: "stripe",
        context: {
          stripe_account_id: event.account ?? null,
          stripe_event_id: event.id,
        },
      });
      break;
    }

    default:
      // Ignore unsubscribed event kinds (we still 200 so Stripe doesn't retry).
      break;
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "stripe-connect-webhook" });
}
