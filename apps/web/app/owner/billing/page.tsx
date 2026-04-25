import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { account } = await requireOwnerContext();
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // Stripe portal flow only kicks in once the key is configured AND the
  // account row carries a stripe_customer_id (set by an out-of-band
  // provisioning step — that's a v1.2 thing).
  const hasStripe = Boolean(stripeKey);
  const customerId = (account as { stripe_customer_id?: string | null })
    .stripe_customer_id;

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <p className="label-mono mb-1">Settings</p>
      <h1 className="display-lg leading-[0.95] mb-2">Billing</h1>
      <p className="text-muted text-sm mb-6">
        {account.display_name} · {account.account_type}
      </p>

      {!hasStripe ? (
        <EmptyState
          title="Billing coming soon"
          body="Stripe isn't wired up yet. Reach out to the founder to set up your account."
          action={
            <a
              href="mailto:jmontero@mainframeagency.com"
              className="btn-primary inline-block"
            >
              Email support
            </a>
          }
        />
      ) : !customerId ? (
        <section className="card">
          <p className="label-mono mb-2">Plan</p>
          <p className="font-sans text-cream font-semibold mb-3">
            Free trial — no card on file
          </p>
          <p className="text-muted text-sm mb-4">
            Upgrade to keep running events past the trial. We&apos;ll create
            your customer record at first checkout.
          </p>
          <Link
            href="/api/billing/checkout"
            className="btn-primary inline-block"
          >
            Set up billing
          </Link>
        </section>
      ) : (
        <section className="card">
          <p className="label-mono mb-2">Plan</p>
          <p className="font-sans text-cream font-semibold mb-3">
            Stripe customer · {customerId.slice(0, 12)}…
          </p>
          <p className="text-muted text-sm mb-4">
            Manage your subscription, payment method, and invoices via the
            Stripe Customer Portal.
          </p>
          <Link
            href="/api/billing/portal"
            className="btn-primary inline-block"
          >
            Open billing portal
          </Link>
        </section>
      )}

      <section className="card mt-4">
        <p className="label-mono mb-2">What you get</p>
        <ul className="text-muted text-sm space-y-1 list-disc list-inside">
          <li>Unlimited events &amp; nights</li>
          <li>Unlimited allocations &amp; staff invites</li>
          <li>QR scanner, name search, manual add at door</li>
          <li>Recap, audit log, CSV / print export</li>
          <li>Chat Hub AI parsing</li>
          <li>Promoter scorecards across events</li>
        </ul>
      </section>
    </main>
  );
}
