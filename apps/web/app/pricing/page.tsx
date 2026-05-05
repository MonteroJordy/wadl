import Link from "next/link";
import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";
import { Button, Chip, IconArrow, IconCheck } from "@/components/wadl";

export const metadata = {
  title: "Pricing — WADL",
  description:
    "Free for one venue. Pro at $199/mo for the operator running real nights. Enterprise for venue groups.",
  openGraph: {
    title: "Pricing — WADL",
    description: "Free for one venue. Pro at $199/mo. Enterprise for groups.",
    images: ["/api/og/landing"],
  },
};

const TIERS = [
  {
    name: "Starter",
    price: "Free",
    sub: "1 venue · forever",
    cta: { label: "Start free", href: "/signup" },
    features: [
      "1 venue",
      "50 guests per event",
      "Magic-link holder lists",
      "Door scanner (online)",
      "WADL branding on tickets",
      "Bring-your-own Twilio for SMS",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$199",
    sub: "per month · billed monthly",
    highlight: true,
    cta: {
      label: "Talk to us",
      href: "mailto:jmontero@mainframeagency.com?subject=WADL%20Pro%20signup",
    },
    features: [
      "Up to 3 venues",
      "Unlimited events + nights",
      "Unlimited guests",
      "Chat Hub AI parsing",
      "Promoter scorecards",
      "Email + SMS sends included",
      "Offline scanner",
      "Wallet passes, embed widget, webhooks",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "for venue groups",
    cta: {
      label: "Contact sales",
      href: "mailto:jmontero@mainframeagency.com?subject=WADL%20Enterprise",
    },
    features: [
      "Unlimited venues",
      "White-label tickets + emails",
      "Stripe Connect promoter payouts",
      "Custom SMS sender (your number)",
      "SAML SSO + role-based admin",
      "Dedicated migration",
      "Operator on-call for opening night",
    ],
  },
];

const FAQ = [
  [
    "Is there a per-guest fee?",
    "No. Pro and Enterprise are flat. Starter caps at 50 guests per event so you can prove it works without committing.",
  ],
  [
    "What about SMS costs?",
    "Starter is BYO Twilio (you bring your own credentials). Pro includes a generous SMS allowance through our number. Enterprise lets you use your own number with branded sender.",
  ],
  [
    "Can I cancel?",
    "Anytime. Pro is month-to-month. Your data stays accessible for 90 days after cancel; export to CSV any time.",
  ],
  [
    "Do I need a credit card to start?",
    "No. Sign up free, run a real event, then upgrade if it earns its keep.",
  ],
];

export default function PricingPage() {
  return (
    <>
      <PublicShell maxWidth="6xl" ambient>
        <header style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="w-type-meta">PRICING</div>
          <h1
            className="w-type-display-lg"
            style={{ marginTop: 12, lineHeight: 0.94 }}
          >
            Honest pricing.
            <br />
            Door-first.
          </h1>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 540,
              marginInline: "auto",
            }}
          >
            One venue, free forever. Bigger nights, bigger plan. We don&apos;t
            charge per-guest because that&apos;s the SaaS-bro move and you
            already pay enough for the bar.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 64,
          }}
        >
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="w-card"
              style={{
                padding: 28,
                display: "flex",
                flexDirection: "column",
                borderColor: t.highlight
                  ? "var(--w-acc)"
                  : "var(--w-line)",
                background: t.highlight
                  ? "var(--w-acc-soft)"
                  : "var(--w-surface-2)",
                position: "relative",
              }}
            >
              {t.highlight && (
                <Chip
                  tone="acc"
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                  }}
                >
                  RECOMMENDED
                </Chip>
              )}
              <div
                className="w-type-meta"
                style={{ color: t.highlight ? "var(--w-acc)" : "var(--w-fg-muted)" }}
              >
                {t.name.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 56,
                  letterSpacing: "-0.035em",
                  lineHeight: 0.94,
                  marginTop: 6,
                }}
              >
                {t.price}
              </div>
              <div className="w-type-meta" style={{ marginTop: 6 }}>
                {t.sub.toUpperCase()}
              </div>
              <ul
                style={{
                  flex: 1,
                  marginTop: 22,
                  marginBottom: 22,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {t.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      color: "var(--w-fg)",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        color: t.highlight
                          ? "var(--w-acc)"
                          : "var(--w-fg-muted)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <IconCheck size={14} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={t.cta.href}
                style={{ textDecoration: "none" }}
              >
                <Button variant={t.highlight ? "primary" : "ghost"} block>
                  {t.cta.label}
                </Button>
              </Link>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: 56 }}>
          <div className="w-type-meta">FAQ</div>
          <h2
            className="w-type-display-md"
            style={{ marginTop: 8, marginBottom: 28 }}
          >
            The short answers.
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {FAQ.map(([q, a]) => (
              <div key={q} className="w-card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{q}</div>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg-muted)",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            textAlign: "center",
            padding: "32px 0 16px",
          }}
        >
          <h2 className="w-type-display-md">Try it on a real night.</h2>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 12,
            }}
          >
            Five minutes to set up. Free for your first venue.
          </p>
          <Link
            href="/signup"
            style={{
              display: "inline-flex",
              marginTop: 24,
              textDecoration: "none",
            }}
          >
            <Button variant="primary" size="lg">
              Start free <IconArrow size={14} />
            </Button>
          </Link>
        </section>
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
