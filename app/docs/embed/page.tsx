import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Embed widget — WADL docs",
  description:
    "Drop a WADL RSVP widget into your venue's website with a single iframe.",
};

export default function EmbedDocsPage() {
  const exampleId = "YOUR_EVENT_ID";
  const baseSnippet = `<iframe
  src="https://wadl-pearl.vercel.app/embed/${exampleId}"
  width="380"
  height="520"
  frameborder="0"
  allowtransparency="true"
  style="border:0;background:transparent;"
  title="RSVP — your event"
></iframe>`;

  const brandedSnippet = `<iframe
  src="https://wadl-pearl.vercel.app/embed/${exampleId}?accent=%23FF4A2B"
  width="380"
  height="520"
  frameborder="0"
  allowtransparency="true"
  style="border:0;background:transparent;"
  title="RSVP — your event"
></iframe>`;

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

        <article className="px-6 md:px-12 py-8 max-w-3xl mx-auto prose-wadl">
          <p className="label-mono mb-2">Docs · Integrations</p>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide mb-3">
            Embed widget
          </h1>
          <p className="text-cream/80 leading-relaxed mb-8">
            Drop a WADL RSVP widget into your venue&apos;s existing website with
            a single iframe. Works on Squarespace, Webflow, Wix, plain HTML —
            anywhere you can paste an iframe.
          </p>

          <h2>Find your event ID</h2>
          <p>
            Open the event in <code>/owner/events/[id]</code>. The ID is the
            UUID in the URL. Or click <strong>Embed widget</strong> on the
            daydash to preview yours.
          </p>

          <h2>Copy this snippet</h2>
          <p>
            Replace <code>YOUR_EVENT_ID</code> with your event&apos;s UUID:
          </p>
          <pre className="bg-s2 border border-line rounded-md p-4 text-xs overflow-x-auto font-mono text-cream/90">
            {baseSnippet}
          </pre>

          <h2>Brand-color override</h2>
          <p>
            Pass <code>?accent=#XXXXXX</code> as a URL-encoded hex color
            (the <code>#</code> becomes <code>%23</code>):
          </p>
          <pre className="bg-s2 border border-line rounded-md p-4 text-xs overflow-x-auto font-mono text-cream/90">
            {brandedSnippet}
          </pre>

          <h2>How it works</h2>
          <ul>
            <li>
              The iframe loads <code>/embed/[eventId]</code>, which renders a
              transparent-background mini-RSVP card.
            </li>
            <li>
              The form submits to a server action that creates a{" "}
              <strong>pending</strong> RSVP. Owners get a notification + queue
              row to approve.
            </li>
            <li>
              Rate-limited to 20 RSVPs per IP per minute to deter spam.
            </li>
            <li>
              Phone numbers are normalized to E.164. Duplicates by phone are
              skipped.
            </li>
            <li>
              Fires the <code>rsvp.created</code> webhook with{" "}
              <code>via: &quot;embed&quot;</code> on each submission.
            </li>
          </ul>

          <h2>Sizing</h2>
          <p>
            <code>width=&quot;380&quot;</code> and{" "}
            <code>height=&quot;520&quot;</code> are good defaults for the
            confirmation state. The widget&apos;s internal max-width is 360px
            so it stays snug at most embed widths. If your container is
            narrow on mobile, set <code>width=&quot;100%&quot;</code> and
            keep height fixed.
          </p>

          <h2>Styling notes</h2>
          <ul>
            <li>
              <strong>Background</strong> is transparent so it inherits the
              host page&apos;s background. Pair with a dark site.
            </li>
            <li>
              The container itself uses a translucent dark card so it remains
              legible on light hosts. If your host site is dark, no further
              tuning needed. If light, prefer a section background that&apos;s
              at least mid-tone.
            </li>
            <li>
              All copy is system-font sans-serif so we don&apos;t pull in
              brand fonts that might conflict.
            </li>
          </ul>

          <h2>Live preview</h2>
          <p>
            Open <code>/embed/YOUR_EVENT_ID</code> directly in a browser tab
            to preview without an iframe wrapper.
          </p>

          <h2>Limits + caveats</h2>
          <ul>
            <li>Embeds are public, so anyone with the URL can submit.</li>
            <li>RSVPs land as <strong>pending</strong> until you approve them.</li>
            <li>
              We don&apos;t deliver the QR ticket via the embed (no SMS path
              from a third-party site). Approve from the queue and the
              standard SMS flow takes over.
            </li>
            <li>
              No iframe sandbox / X-Frame-Options blocking — the widget is
              meant to be embedded.
            </li>
          </ul>

          <h2>Questions?</h2>
          <p>
            <a
              href="mailto:jmontero@mainframeagency.com"
              className="text-coral"
            >
              jmontero@mainframeagency.com
            </a>
          </p>
        </article>
      </main>
      <MarketingFooter />
      <style>{`
        .prose-wadl h2 {
          font-family: var(--font-bebas), sans-serif;
          font-size: 1.5rem;
          color: #FF4A2B;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .prose-wadl p, .prose-wadl li {
          color: rgba(242, 237, 228, 0.8);
          line-height: 1.65;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .prose-wadl ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }
        .prose-wadl strong {
          color: #F2EDE4;
        }
        .prose-wadl code {
          font-family: var(--font-dm-mono), monospace;
          background: #181818;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.85em;
          color: #00D97E;
        }
      `}</style>
    </>
  );
}
