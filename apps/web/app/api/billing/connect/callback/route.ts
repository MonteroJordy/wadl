import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Stripe Connect OAuth return URL (Day 25).
 *
 * The "Connect Stripe account" button in /owner/payouts sends the owner to
 * https://connect.stripe.com/oauth/authorize. After consent, Stripe redirects
 * back here with ?code=… (success) or ?error=… (denial).
 *
 * We exchange the code for the connected account ID via the Stripe REST API,
 * then upsert connect_accounts and stamp accounts.stripe_connect_account_id.
 *
 * Required env: STRIPE_SECRET_KEY (the platform's secret).
 *
 * Configure in Stripe: Connect → Settings → Redirect URI must be
 *   https://wadl-pearl.vercel.app/api/billing/connect/callback
 *
 * Operator alternative (recommended): use Stripe Connect Express Onboarding
 * via the Account Links API — that flow doesn't need this OAuth callback.
 * This route covers the OAuth path that the /owner/payouts button uses today.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=${encodeURIComponent(
        errorDescription ?? errorParam
      )}`
    );
  }
  if (!code) {
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=missing_code`
    );
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=stripe_secret_missing`
    );
  }

  // Authenticated user → which WADL account is linking?
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) {
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=no_account`
    );
  }
  const wadlAccountId = profile.account_id;

  // Exchange the code for the connected account ID.
  const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_secret: stripeSecret,
      code,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.warn("[connect-oauth] token exchange failed", tokenRes.status, text.slice(0, 300));
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=token_exchange_${tokenRes.status}`
    );
  }

  const tokenData = (await tokenRes.json()) as {
    stripe_user_id?: string;
    scope?: string;
  };
  const stripeAccountId = tokenData.stripe_user_id;
  if (!stripeAccountId) {
    return NextResponse.redirect(
      `${getAppUrl()}/owner/payouts?connect_error=no_user_id`
    );
  }

  // Pull the account object once so we can populate the row even if the
  // webhook hasn't fired yet.
  const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
    headers: { Authorization: `Bearer ${stripeSecret}` },
  });
  let chargesEnabled = false;
  let payoutsEnabled = false;
  let detailsSubmitted = false;
  let defaultCurrency: string | null = null;
  let email: string | null = null;
  let country: string | null = null;
  if (acctRes.ok) {
    const acct = (await acctRes.json()) as {
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
      default_currency?: string | null;
      email?: string | null;
      country?: string | null;
    };
    chargesEnabled = !!acct.charges_enabled;
    payoutsEnabled = !!acct.payouts_enabled;
    detailsSubmitted = !!acct.details_submitted;
    defaultCurrency = acct.default_currency ?? null;
    email = acct.email ?? null;
    country = acct.country ?? null;
  }

  // Update the metadata.wadl_account_id on the connected account so future
  // webhook events can attribute back without our DB.
  await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "metadata[wadl_account_id]": wadlAccountId,
    }).toString(),
  });

  const admin = createAdminClient();
  await admin.from("connect_accounts").upsert(
    {
      account_id: wadlAccountId,
      stripe_account_id: stripeAccountId,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
      default_currency: defaultCurrency,
      email,
      country,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_account_id" }
  );

  await admin
    .from("accounts")
    .update({ stripe_connect_account_id: stripeAccountId })
    .eq("id", wadlAccountId);

  await admin.from("audit_log").insert({
    action: "stripe.connect.linked",
    entity_type: "account",
    entity_id: wadlAccountId,
    actor_user_id: user.id,
    context: { stripe_account_id: stripeAccountId },
  });

  return NextResponse.redirect(`${getAppUrl()}/owner/payouts?connect=ok`);
}
