import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { account } = await requireOwnerContext();
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  const hasStripe = Boolean(stripeKey);
  const customerId = (account as { stripe_customer_id?: string | null })
    .stripe_customer_id;

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Settings · Billing"
        title="Billing"
        sub={`${account.display_name} · ${account.account_type}`}
      />
      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        {!hasStripe ? (
          <div
            className="card"
            style={{ padding: "var(--s-10) var(--s-8)", textAlign: "center" }}
          >
            <span className="chip">Beta</span>
            <div className="t-display-sm" style={{ marginTop: "var(--s-3)" }}>
              No card needed
            </div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              Free during beta. Founding venues lock in pricing before launch —
              we&apos;ll email before any card hits.
            </p>
            <a
              href="mailto:jmontero@mainframeagency.com"
              className="btn btn--ghost"
              style={{ marginTop: "var(--s-6)" }}
            >
              Email the founder
            </a>
          </div>
        ) : !customerId ? (
          <div className="card" style={{ padding: "var(--s-6)" }}>
            <div className="t-meta">Plan</div>
            <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
              Free trial — no card on file
            </div>
            <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              Upgrade to keep running events past the trial. We&apos;ll create
              your customer record at first checkout.
            </p>
            <Link
              href="/api/billing/checkout"
              className="btn"
              style={{ marginTop: "var(--s-4)" }}
            >
              Set up billing
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "var(--s-6)" }}>
            <div className="t-meta">Stripe customer</div>
            <div
              className="t-num"
              style={{
                fontFamily: "var(--mono)",
                fontSize: "var(--ts-md)",
                marginTop: "var(--s-2)",
              }}
            >
              {customerId.slice(0, 12)}…
            </div>
            <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
              Manage your subscription, payment method, and invoices via the
              Stripe Customer Portal.
            </p>
            <Link
              href="/api/billing/portal"
              className="btn"
              style={{ marginTop: "var(--s-4)" }}
            >
              Open billing portal
            </Link>
          </div>
        )}

        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta">What you get</div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              marginTop: "var(--s-3)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {[
              "Unlimited events & nights",
              "Unlimited allocations & staff invites",
              "QR scanner, name search, manual add at the door",
              "Recap, audit log, CSV / print export",
              "Chat Hub AI parsing",
              "Per-tier promoter scorecards across events",
            ].map((line) => (
              <li
                key={line}
                className="t-body-2"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--s-2)",
                }}
              >
                <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
