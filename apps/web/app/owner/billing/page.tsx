import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { Button, Chip, IconCheck } from "@/components/wadl";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { account } = await requireOwnerContext();
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  const hasStripe = Boolean(stripeKey);
  const customerId = (account as { stripe_customer_id?: string | null })
    .stripe_customer_id;

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
          }}
        >
          <div className="w-type-meta">SETTINGS · BILLING</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Billing
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
            }}
          >
            {account.display_name} · {account.account_type}
          </p>
        </div>

        {!hasStripe ? (
          <div
            className="w-card"
            style={{
              padding: "48px 32px",
              textAlign: "center",
              marginTop: 24,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <Chip tone="acc">FREE WHILE WE HAMMER</Chip>
            <div
              className="w-type-h1"
              style={{ marginTop: 12 }}
            >
              No card needed
            </div>
            <p
              className="w-type-body-sm"
              style={{
                marginTop: 12,
                maxWidth: 480,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              WADL is free while we hammer it into shape. Pricing flips on with
              your first paying customer — we&apos;ll email before any card
              hits.
            </p>
            <a
              href="mailto:jmontero@mainframeagency.com"
              className="w-btn w-btn--ghost"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Email the founder
            </a>
          </div>
        ) : !customerId ? (
          <div
            className="w-card"
            style={{ padding: 22, marginTop: 24 }}
          >
            <div className="w-type-meta">PLAN</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 17,
                marginTop: 6,
              }}
            >
              Free trial — no card on file
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              Upgrade to keep running events past the trial. We&apos;ll create
              your customer record at first checkout.
            </p>
            <Link
              href="/api/billing/checkout"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              <Button variant="primary">Set up billing</Button>
            </Link>
          </div>
        ) : (
          <div
            className="w-card"
            style={{ padding: 22, marginTop: 24 }}
          >
            <div className="w-type-meta">STRIPE CUSTOMER</div>
            <div
              style={{
                fontFamily: "var(--w-mono)",
                fontSize: 14,
                marginTop: 6,
              }}
            >
              {customerId.slice(0, 12)}…
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              Manage your subscription, payment method, and invoices via the
              Stripe Customer Portal.
            </p>
            <Link
              href="/api/billing/portal"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              <Button variant="primary">Open billing portal</Button>
            </Link>
          </div>
        )}

        <div
          className="w-card"
          style={{ padding: 22, marginTop: 12 }}
        >
          <div className="w-type-meta">WHAT YOU GET</div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 14,
              color: "var(--w-fg-muted)",
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
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    color: "var(--w-acc)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <IconCheck size={14} />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
