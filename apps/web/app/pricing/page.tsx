import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

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
      label: "Start Pro",
      href: "/signup?type=venue",
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

const FAQ: Array<[string, string]> = [
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
      <header
        style={{
          padding: "var(--s-4) var(--s-6)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-4)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--s-5)" }}>
          <Link
            href="/discover"
            className="t-meta hidden sm:inline"
            style={{ textDecoration: "none", color: "var(--fg-2)" }}
          >
            TONIGHT
          </Link>
          <Link
            href="/login"
            className="t-meta"
            style={{ textDecoration: "none", color: "var(--fg-2)" }}
          >
            SIGN IN
          </Link>
          <Link
            href="/signup"
            className="btn btn--sm"
            style={{ textDecoration: "none" }}
          >
            Start free
          </Link>
        </nav>
      </header>
      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "var(--s-12) var(--s-6)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div>
          <header
            style={{ textAlign: "center", marginBottom: "var(--s-16)" }}
          >
            <div className="t-meta">Pricing</div>
            <h1
              className="t-display-lg"
              style={{ marginTop: "var(--s-3)", lineHeight: 1.0 }}
            >
              Honest pricing.
              <br />
              Door-first.
            </h1>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-4)",
                maxWidth: 540,
                marginInline: "auto",
              }}
            >
              One venue, free forever. Bigger nights, bigger plan. We
              don&apos;t charge per-guest because that&apos;s the SaaS-bro
              move and you already pay enough for the bar.
            </p>
            <p
              className="t-meta"
              style={{ marginTop: "var(--s-4)" }}
            >
              Free during beta — founding-venue pricing locks in below.
            </p>
          </header>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--s-4)",
              marginBottom: "var(--s-20)",
            }}
          >
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="card"
                style={{
                  padding: "var(--s-7)",
                  display: "flex",
                  flexDirection: "column",
                  borderColor: t.highlight ? "var(--fg)" : "var(--line)",
                  position: "relative",
                }}
              >
                {t.highlight && (
                  <span
                    className="chip chip--accent"
                    style={{
                      position: "absolute",
                      top: "var(--s-4)",
                      right: "var(--s-4)",
                    }}
                  >
                    Recommended
                  </span>
                )}
                <div className="t-meta">{t.name}</div>
                <div
                  className="t-display-md t-num"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  {t.price}
                </div>
                <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                  {t.sub}
                </div>
                <ul
                  style={{
                    flex: 1,
                    marginTop: "var(--s-6)",
                    marginBottom: "var(--s-6)",
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="t-body-2"
                      style={{
                        display: "flex",
                        gap: "var(--s-3)",
                        color: "var(--fg-2)",
                      }}
                    >
                      <span style={{ color: "var(--fg-4)", flexShrink: 0 }}>
                        ·
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta.href}
                  className={
                    t.highlight
                      ? "btn btn--lg btn--accent btn--block"
                      : "btn btn--ghost btn--lg btn--block"
                  }
                  style={{ textDecoration: "none" }}
                >
                  {t.cta.label}
                </Link>
              </div>
            ))}
          </section>

          <section style={{ marginBottom: "var(--s-16)" }}>
            <div className="t-meta">FAQ</div>
            <h2
              className="t-display-md"
              style={{
                marginTop: "var(--s-2)",
                marginBottom: "var(--s-7)",
              }}
            >
              The short answers.
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "var(--s-3)",
              }}
            >
              {FAQ.map(([q, a]) => (
                <div
                  key={q}
                  className="card"
                  style={{ padding: "var(--s-5)" }}
                >
                  <div className="t-h1">{q}</div>
                  <p
                    className="t-body-2"
                    style={{ marginTop: "var(--s-2)" }}
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
              padding: "var(--s-8) 0 var(--s-4)",
            }}
          >
            <h2 className="t-display-md">Try it on a real night.</h2>
            <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
              Five minutes to set up. Free for your first venue.
            </p>
            <div style={{ marginTop: "var(--s-6)" }}>
              <Link
                href="/signup"
                className="btn btn--lg"
                style={{ textDecoration: "none" }}
              >
                Start free →
              </Link>
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
