import { requireOwnerContext } from "@/lib/owner";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const { account } = await requireOwnerContext();
  const enabled = !!process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!enabled) {
    return (
      <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
        <p className="label-mono mb-1">Promoter payouts</p>
        <h1 className="display-lg leading-[0.95] mb-6">Coming soon</h1>
        <EmptyState
          title="Stripe Connect not enabled"
          body="Set STRIPE_CONNECT_CLIENT_ID on the deployment to enable promoter payout flows. Each promoter onboards via Stripe Connect Express and gets paid commission per scanned-in head."
          action={
            <a
              href="mailto:jmontero@mainframeagency.com?subject=Enable%20Stripe%20Connect"
              className="btn-primary inline-block"
            >
              Email support
            </a>
          }
        />
      </main>
    );
  }

  // Once Connect is enabled, this is where we'd surface:
  // - Owner's connected account status (charges_enabled / payouts_enabled)
  // - Per-promoter Express onboarding link
  // - Pending payout amount + schedule
  // - Past payouts (Connect transfers)
  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <p className="label-mono mb-1">Promoter payouts</p>
      <h1 className="display-lg leading-[0.95] mb-2">Payouts</h1>
      <p className="text-muted text-sm mb-6">
        {account.display_name}
      </p>

      <section className="card mb-4">
        <p className="label-mono mb-2">Status</p>
        <p className="font-sans text-cream font-semibold mb-3">
          Connect onboarding pending
        </p>
        <p className="text-muted text-sm mb-4">
          Complete Stripe&apos;s Express onboarding to start receiving promoter commissions.
        </p>
        <a
          href={`https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CONNECT_CLIENT_ID}&scope=read_write`}
          className="btn-primary inline-block"
        >
          Connect Stripe account
        </a>
      </section>

      <section className="card">
        <p className="label-mono mb-2">How it works</p>
        <ul className="text-muted text-sm space-y-1 list-disc list-inside">
          <li>Each promoter onboards via Stripe Connect Express</li>
          <li>WADL tracks scanned-in heads per promoter (scorecards)</li>
          <li>Commission rate per allocation set on the allocation page</li>
          <li>Payouts triggered weekly</li>
        </ul>
      </section>
    </main>
  );
}
