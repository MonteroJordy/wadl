import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nextOnboardingStep } from "@/lib/routing";
import type { Account, Profile } from "@/lib/types";
import MarketingFooter from "@/components/marketing-footer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "WADL — One door, one list, one truth.",
  description:
    "Stop losing the door to chaos. WADL turns nightlife guest lists into a single attributed list every venue trusts.",
  openGraph: {
    title: "WADL — One door, one list, one truth.",
    description:
      "Stop losing the door to chaos. WADL turns nightlife guest lists into a single attributed list every venue trusts.",
    images: ["/api/og/landing"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/landing"],
  },
};

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authed users still bounce: guest → /mytickets, owner → /owner.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();

    if (profile?.role === "guest") redirect("/mytickets");

    let account: Account | null = null;
    if (profile?.account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", profile.account_id)
        .maybeSingle<Account>();
      account = data;
    }
    let hasVenue = false;
    if (account?.account_type === "venue") {
      const { count } = await supabase
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);
      hasVenue = (count ?? 0) > 0;
    }
    redirect(nextOnboardingStep(profile, account, hasVenue));
  }

  // Anonymous → public landing.
  return (
    <>
      <main className="bg-bg text-cream">
        {/* Top nav */}
        <header className="px-6 md:px-12 pt-6 pb-4 flex items-center justify-between max-w-6xl mx-auto">
          <Link
            href="/"
            className="font-display text-2xl text-coral tracking-wide"
            aria-label="WADL home"
          >
            WADL
          </Link>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link
              href="/pricing"
              className="label-mono hover:text-cream"
            >
              Pricing
            </Link>
            <Link
              href="/discover"
              className="label-mono hover:text-cream hidden md:inline"
            >
              Tonight
            </Link>
            <Link
              href="/login"
              className="label-mono hover:text-cream"
            >
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

        {/* Hero */}
        <section className="px-6 md:px-12 pt-12 md:pt-24 pb-16 md:pb-32 max-w-6xl mx-auto">
          <p className="label-mono mb-4">For nightlife operators</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.92] tracking-wide uppercase mb-6 md:mb-8 text-cream max-w-4xl">
            Stop losing the door to chaos.
          </h1>
          <p className="text-base md:text-xl text-cream/80 leading-relaxed max-w-2xl mb-8">
            WADL turns nightlife guest lists into a single attributed list
            every venue trusts. One door, one truth, every name accounted for.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="bg-coral text-bg font-sans font-semibold text-sm uppercase tracking-[0.14em] px-6 py-4 rounded-md hover:brightness-110 transition inline-block"
            >
              Start free →
            </Link>
            <Link
              href="/pricing"
              className="border border-line text-cream font-sans font-semibold text-sm uppercase tracking-[0.14em] px-6 py-4 rounded-md hover:border-cream/30 transition inline-block"
            >
              See pricing
            </Link>
          </div>
        </section>

        {/* Three feature blocks */}
        <section
          id="features"
          className="px-6 md:px-12 py-16 md:py-24 bg-s1 border-y border-line"
        >
          <div className="max-w-6xl mx-auto">
            <p className="label-mono mb-3">What you get</p>
            <h2 className="font-display text-3xl md:text-5xl uppercase tracking-wide mb-12">
              Built for the door, not the deck.
            </h2>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="card border-coral/30">
                <p className="font-display text-2xl text-coral mb-2">01</p>
                <h3 className="font-sans font-semibold text-cream text-lg mb-2">
                  Magic links for promoters
                </h3>
                <p className="text-cream/70 text-sm leading-relaxed">
                  Send a holder a link. They add names. No app, no account,
                  no password reset at midnight. Cap enforced server-side.
                </p>
              </div>
              <div className="card border-gold/30">
                <p className="font-display text-2xl text-gold mb-2">02</p>
                <h3 className="font-sans font-semibold text-cream text-lg mb-2">
                  Chat Hub AI
                </h3>
                <p className="text-cream/70 text-sm leading-relaxed">
                  Paste a WhatsApp dump. AI parses names, +1s, tiers, holders.
                  Review, commit. The list is on the door in seconds.
                </p>
              </div>
              <div className="card border-mint/30">
                <p className="font-display text-2xl text-mint mb-2">03</p>
                <h3 className="font-sans font-semibold text-cream text-lg mb-2">
                  Door scanner
                </h3>
                <p className="text-cream/70 text-sm leading-relaxed">
                  QR scanner with five fail states. Approved, already in,
                  not on list, wrong night, do not admit. Works offline.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
          <p className="label-mono mb-6 text-center">Built with operators in Miami</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 md:gap-x-16 gap-y-4 opacity-60">
            <p className="font-display text-2xl tracking-wider text-cream/60">
              The Patio
            </p>
            <p className="font-display text-2xl tracking-wider text-cream/60">
              Wynwood
            </p>
            <p className="font-display text-2xl tracking-wider text-cream/60">
              Brickell Nights
            </p>
            <p className="font-display text-2xl tracking-wider text-cream/60">
              South Beach Co.
            </p>
            <p className="font-display text-2xl tracking-wider text-cream/60">
              + your venue
            </p>
          </div>
        </section>

        {/* Founder note */}
        <section className="px-6 md:px-12 py-16 md:py-24 bg-s1 border-y border-line">
          <div className="max-w-3xl mx-auto">
            <p className="label-mono mb-3">A note from the founder</p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wide mb-6">
              I work the door too.
            </h2>
            <div className="text-cream/80 leading-relaxed space-y-4 text-base md:text-lg">
              <p>
                I&apos;m Jordy. I run nights in Miami. The list is a Google
                Sheet that becomes three Google Sheets that becomes a WhatsApp
                screenshot at the door. Fights start over names that aren&apos;t there.
                Promoters take credit for arrivals they didn&apos;t bring. The line
                stops moving.
              </p>
              <p>
                WADL is the tool I needed. It went from a notebook sketch to a
                shipped product because every weekend I pay for what isn&apos;t
                there. If you run nights, you know exactly what I mean.
              </p>
              <p className="font-display text-xl text-coral mt-6">— Jordy</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 md:px-12 py-16 md:py-24 max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl uppercase tracking-wide mb-4">
            Run your next night with WADL.
          </h2>
          <p className="text-cream/70 mb-8">
            Free for one venue. No card. Set up in under five minutes.
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
