import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Docs — WADL",
  description: "Integration docs for WADL.",
};

export default function DocsIndexPage() {
  return (
    <>
      <main className="bg-bg text-cream min-h-screen">
        <header className="px-6 md:px-12 pt-6 pb-4 flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="font-display text-2xl text-coral tracking-wide">
            WADL
          </Link>
          <Link href="/" className="label-mono hover:text-cream">
            ← Home
          </Link>
        </header>

        <section className="px-6 md:px-12 py-8 max-w-3xl mx-auto">
          <p className="label-mono mb-2">Docs</p>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide mb-8">
            Integrations
          </h1>

          <ul className="flex flex-col gap-3">
            <li className="card hover:border-coral/60 transition">
              <Link href="/docs/embed">
                <p className="font-sans font-semibold text-cream">
                  Embed widget
                </p>
                <p className="label-mono mt-1">
                  Drop an RSVP form into your venue site with one iframe.
                </p>
              </Link>
            </li>
            <li className="card">
              <p className="font-sans font-semibold text-cream">Webhooks</p>
              <p className="label-mono mt-1">
                Manage from <code>/owner/webhooks</code>. HMAC-SHA256 signed
                payloads, exponential backoff, recent-deliveries log.
              </p>
            </li>
            <li className="card">
              <p className="font-sans font-semibold text-cream">Calendar (.ics)</p>
              <p className="label-mono mt-1">
                Public per-event calendar feed at{" "}
                <code>/api/events/[id]/ics</code>. One VEVENT per night.
              </p>
            </li>
            <li className="card">
              <p className="font-sans font-semibold text-cream">Wallet passes</p>
              <p className="label-mono mt-1">
                Apple + Google Wallet routes at{" "}
                <code>/api/wallet/apple/[token]</code> and{" "}
                <code>/api/wallet/google/[token]</code>. Require provider env
                vars.
              </p>
            </li>
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
