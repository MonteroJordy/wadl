import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Redirect the signed-in owner to their Stripe Customer Portal session.
 * Returns 503 with a JSON body when STRIPE_SECRET_KEY isn't configured —
 * the /owner/billing page handles that case with a placeholder UI.
 */
export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) {
    return NextResponse.redirect(`${getAppUrl()}/owner/billing`);
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", profile.account_id)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (!account?.stripe_customer_id) {
    return NextResponse.redirect(`${getAppUrl()}/owner/billing`);
  }

  // Hit Stripe API directly — keeps us off the stripe SDK dependency.
  const params = new URLSearchParams({
    customer: account.stripe_customer_id,
    return_url: `${getAppUrl()}/owner/billing`,
  });
  const res = await fetch(
    "https://api.stripe.com/v1/billing_portal/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `Stripe ${res.status}` },
      { status: 502 }
    );
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    return NextResponse.json(
      { error: "No portal URL returned" },
      { status: 502 }
    );
  }
  return NextResponse.redirect(data.url);
}
