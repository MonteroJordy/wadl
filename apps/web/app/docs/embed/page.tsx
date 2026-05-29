import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Embed widget — WADL docs",
  description:
    "Drop a WADL RSVP widget into your venue's website with a single iframe.",
};

const H2: React.CSSProperties = {
  marginTop: "var(--s-10)",
  marginBottom: "var(--s-3)",
};
const P: React.CSSProperties = { marginTop: "var(--s-3)" };
const CODE: React.CSSProperties = {
  fontFamily: "var(--mono)",
  background: "var(--bg-3)",
  padding: "1px 6px",
  borderRadius: "var(--r-sm)",
  fontSize: "0.85em",
  color: "var(--fg)",
};

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-md)",
        padding: "var(--s-4)",
        fontSize: 12,
        overflowX: "auto",
        fontFamily: "var(--mono)",
        color: "var(--fg-2)",
        marginTop: "var(--s-3)",
      }}
    >
      {children}
    </pre>
  );
}

function PublicFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--s-10) var(--s-6)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--s-6)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Logo size={22} />
          <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
            One door · one list · one truth
          </div>
          <div
            className="t-meta"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-4)" }}
          >
            © {new Date().getFullYear()} WADL · Built in Miami
          </div>
        </div>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-6)" }}>
          {[
            ["Pricing", "/pricing"],
            ["Tonight", "/discover"],
            ["Docs", "/docs"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
            ["Help", "/help"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="t-meta"
              style={{ textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

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
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <header
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--s-5) var(--s-6) var(--s-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
        <Link
          href="/"
          className="t-meta"
          style={{ textDecoration: "none" }}
        >
          ← Home
        </Link>
      </header>

      <article
        style={{
          maxWidth: 740,
          margin: "0 auto",
          padding: "var(--s-8) var(--s-6) var(--s-16)",
        }}
      >
        <p className="t-meta">Docs · Integrations</p>
        <h1 className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          Embed widget
        </h1>
        <p className="t-body" style={{ marginTop: "var(--s-4)" }}>
          Drop a WADL RSVP widget into your venue&apos;s existing website with a
          single iframe. Works on Squarespace, Webflow, Wix, plain HTML —
          anywhere you can paste an iframe.
        </p>

        <h2 className="t-h1" style={H2}>
          Find your event ID
        </h2>
        <p className="t-body-2" style={P}>
          Open the event in <code style={CODE}>/owner/events/[id]</code>. The ID
          is the UUID in the URL. Or click{" "}
          <strong style={{ color: "var(--fg)" }}>Embed widget</strong> on the
          daydash to preview yours.
        </p>

        <h2 className="t-h1" style={H2}>
          Copy this snippet
        </h2>
        <p className="t-body-2" style={P}>
          Replace <code style={CODE}>YOUR_EVENT_ID</code> with your event&apos;s
          UUID:
        </p>
        <Pre>{baseSnippet}</Pre>

        <h2 className="t-h1" style={H2}>
          Brand-color override
        </h2>
        <p className="t-body-2" style={P}>
          Pass <code style={CODE}>?accent=#XXXXXX</code> as a URL-encoded hex
          color (the <code style={CODE}>#</code> becomes{" "}
          <code style={CODE}>%23</code>):
        </p>
        <Pre>{brandedSnippet}</Pre>

        <h2 className="t-h1" style={H2}>
          How it works
        </h2>
        <ul className="docs-ul">
          <li>
            The iframe loads <code style={CODE}>/embed/[eventId]</code>, which
            renders a transparent-background mini-RSVP card.
          </li>
          <li>
            The form submits to a server action that creates a{" "}
            <strong style={{ color: "var(--fg)" }}>pending</strong> RSVP. Owners
            get a notification + queue row to approve.
          </li>
          <li>Rate-limited to 20 RSVPs per IP per minute to deter spam.</li>
          <li>
            Phone numbers are normalized to E.164. Duplicates by phone are
            skipped.
          </li>
          <li>
            Fires the <code style={CODE}>rsvp.created</code> webhook with{" "}
            <code style={CODE}>via: &quot;embed&quot;</code> on each submission.
          </li>
        </ul>

        <h2 className="t-h1" style={H2}>
          Sizing
        </h2>
        <p className="t-body-2" style={P}>
          <code style={CODE}>width=&quot;380&quot;</code> and{" "}
          <code style={CODE}>height=&quot;520&quot;</code> are good defaults for
          the confirmation state. The widget&apos;s internal max-width is 360px
          so it stays snug at most embed widths. If your container is narrow on
          mobile, set <code style={CODE}>width=&quot;100%&quot;</code> and keep
          height fixed.
        </p>

        <h2 className="t-h1" style={H2}>
          Styling notes
        </h2>
        <ul className="docs-ul">
          <li>
            <strong style={{ color: "var(--fg)" }}>Background</strong> is
            transparent so it inherits the host page&apos;s background. Pair
            with a dark site.
          </li>
          <li>
            The container itself uses a translucent dark card so it remains
            legible on light hosts. If your host site is dark, no further tuning
            needed. If light, prefer a section background that&apos;s at least
            mid-tone.
          </li>
          <li>
            All copy is system-font sans-serif so we don&apos;t pull in brand
            fonts that might conflict.
          </li>
        </ul>

        <h2 className="t-h1" style={H2}>
          Live preview
        </h2>
        <p className="t-body-2" style={P}>
          Open <code style={CODE}>/embed/YOUR_EVENT_ID</code> directly in a
          browser tab to preview without an iframe wrapper.
        </p>

        <h2 className="t-h1" style={H2}>
          Limits + caveats
        </h2>
        <ul className="docs-ul">
          <li>Embeds are public, so anyone with the URL can submit.</li>
          <li>
            RSVPs land as{" "}
            <strong style={{ color: "var(--fg)" }}>pending</strong> until you
            approve them.
          </li>
          <li>
            We don&apos;t deliver the QR ticket via the embed (no SMS path from
            a third-party site). Approve from the queue and the standard SMS
            flow takes over.
          </li>
          <li>
            No iframe sandbox / X-Frame-Options blocking — the widget is meant
            to be embedded.
          </li>
        </ul>

        <h2 className="t-h1" style={H2}>
          Questions?
        </h2>
        <p className="t-body-2" style={P}>
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ color: "var(--fg)" }}
          >
            jmontero@mainframeagency.com
          </a>
        </p>
      </article>
      <PublicFooter />
      <style>{`
        .docs-ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-top: var(--s-3);
          display: flex;
          flex-direction: column;
          gap: var(--s-2);
        }
        .docs-ul li {
          font-size: var(--ts-sm);
          line-height: 1.5;
          color: var(--fg-2);
        }
      `}</style>
    </main>
  );
}
