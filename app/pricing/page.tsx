import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";

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
    accent: "border-line",
    accentText: "text-cream",
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
    accent: "border-coral",
    accentText: "text-coral",
    highlight: true,
    cta: { label: "Talk to us", href: "mailto:jmontero@mainframeagency.com?subject=WADL%20Pro%20signup" },
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
    accent: "border-gold",
    accentText: "text-gold",
    cta: { label: "Contact sales", href: "mailto:jmontero@mainframeagency.com?subject=WADL%20Enterprise" },
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

export default function PricingPage() {
  return (
    <>
      <main className="bg-bg text-cream min-h-screen">
        <header className="px-6 md:px-12 pt-6 pb-4 flex items-center justify-between max-w-6xl mx-auto">
          <Link href="/" className="font-display text-2xl text-coral tracking-wide">
            WADL
          </Link>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link href="/discover" className="label-mono hover:text-cream hidden md:inline">
              Tonight
            </Link>
            <Link href="/login" className="label-mono hover:text-cream">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-2 rounded-md hover:brightness-110 transition"
            >
              Start free
            </Link>
          </nav>
        </header>

        <section className="px-6 md:px-12 pt-12 pb-8 max-w-6xl mx-auto text-center">
          <p className="label-mono mb-4">Pricing</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.92] tracking-wide uppercase mb-4">
            Honest pricing.<br />Door-first.
          </h1>
          <p className="text-cream/70 max-w-xl mx-auto">
            One venue, free forever. Bigger nights, bigger plan. We don&apos;t
            charge per-guest because that&apos;s the SaaS-bro move and you
            already pay enough for the bar.
          </p>
        </section>

        <section className="px-6 md:px-12 pb-12 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`card border-2 ${t.accent} ${
                  t.highlight ? "md:scale-105 md:shadow-xl md:shadow-coral/20" : ""
                } flex flex-col`}
              >
                <p className={`label-mono mb-1 ${t.accentText}`}>{t.name}</p>
                <p className="font-display text-5xl text-cream leading-none mb-1">
                  {t.price}
                </p>
                <p className="label-mono mb-4">{t.sub}</p>
                <ul className="flex-1 mb-6 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-cream/80">
                      <span className={t.accentText}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta.href}
                  className={`block text-center font-sans font-semibold text-sm uppercase tracking-[0.14em] py-3 rounded-md transition ${
                    t.highlight
                      ? "bg-coral text-bg hover:brightness-110"
                      : "border border-line text-cream hover:border-cream/30"
                  }`}
                >
                  {t.cta.label}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-12 py-16 bg-s1 border-y border-line">
          <div className="max-w-3xl mx-auto">
            <p className="label-mono mb-3">FAQ</p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wide mb-8">
              The short answers.
            </h2>
            <div className="space-y-6">
              <div>
                <p className="font-sans text-cream font-semibold mb-1">
                  Is there a per-guest fee?
                </p>
                <p className="text-cream/70 text-sm">
                  No. Pro and Enterprise are flat. Starter caps at 50 guests
                  per event so you can prove it works without committing.
                </p>
              </div>
              <div>
                <p className="font-sans text-cream font-semibold mb-1">
                  What about SMS costs?
                </p>
                <p className="text-cream/70 text-sm">
                  Starter is BYO Twilio (you bring your own credentials).
                  Pro includes a generous SMS allowance through our number.
                  Enterprise lets you use your own number with branded sender.
                </p>
              </div>
              <div>
                <p className="font-sans text-cream font-semibold mb-1">
                  Can I cancel?
                </p>
                <p className="text-cream/70 text-sm">
                  Anytime. Pro is month-to-month. Your data stays accessible
                  for 90 days after cancel; export to CSV any time.
                </p>
              </div>
              <div>
                <p className="font-sans text-cream font-semibold mb-1">
                  Do I need a credit card to start?
                </p>
                <p className="text-cream/70 text-sm">
                  No. Sign up free, run a real event, then upgrade if it earns
                  its keep.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-12 py-16 max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wide mb-4">
            Try it on a real night.
          </h2>
          <p className="text-cream/70 mb-6">
            Five minutes to set up. Free for your first venue.
          </p>
          <Link
            href="/signup"
            className="bg-coral text-bg font-sans font-semibold text-sm uppercase tracking-[0.14em] px-8 py-4 rounded-md hover:brightness-110 transition inline-block"
          >
            Start free →
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
