import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Stub for first-checkout flow. Real implementation:
 *  1. Look up or create Stripe Customer for this account.
 *  2. Create a Checkout Session with the chosen price.
 *  3. On success webhook, update accounts.stripe_customer_id +
 *     stripe_subscription_id + subscription_status.
 *  4. Redirect to /owner/billing.
 *
 * For MVP+ we just bounce back to /owner/billing with a notice.
 */
export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.redirect(`${getAppUrl()}/owner/billing`);
  }
  // TODO when we actually take payments: build the Checkout Session here.
  return NextResponse.redirect(
    `${getAppUrl()}/owner/billing?checkout=not-implemented`
  );
}
