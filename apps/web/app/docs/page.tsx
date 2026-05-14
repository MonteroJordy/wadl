import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Docs — WADL",
  description: "Integration docs for WADL.",
};

const ENTRIES = [
  {
    href: "/docs/embed",
    t: "Embed widget",
    d: "Drop an RSVP form into your venue site with one iframe.",
    live: true,
  },
  {
    t: "Webhooks",
    href: "/owner/webhooks",
    d: "HMAC-SHA256 signed payloads, exponential backoff, recent-deliveries log.",
    live: true,
  },
  {
    t: "Calendar (.ics)",
    d: "Public per-event calendar feed at /api/events/[id]/ics. One VEVENT per night.",
    live: true,
  },
  {
    t: "Wallet passes",
    d: "Apple + Google Wallet routes at /api/wallet/[apple|google]/[token]. Require provider env vars.",
    live: true,
  },
];

function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
        background: "rgba(10,10,10,0.78)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--s-3) var(--s-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-4)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
        <nav
          style={{ display: "flex", alignItems: "center", gap: "var(--s-4)" }}
        >
          <Link
            href="/discover"
            className="t-meta"
            style={{ textDecoration: "none" }}
          >
            Tonight
          </Link>
          <Link
            href="/login"
            className="btn btn--ghost btn--sm"
            style={{ textDecoration: "none" }}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
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
            ["Embed widget", "/docs/embed"],
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

export default function DocsIndexPage() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PublicHeader />
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--s-12) var(--s-6) var(--s-16)",
        }}
      >
        <header style={{ marginBottom: "var(--s-8)" }}>
          <div className="t-meta">Docs</div>
          <h1 className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
            Integrations
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-4)", maxWidth: 560 }}
          >
            Hooks, embeds, calendar feeds, wallet passes — every entry point
            into a WADL door.
          </p>
        </header>

        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {ENTRIES.map((e) => {
            const inner = (
              <div
                className={e.href ? "card card--hover" : "card"}
                style={{
                  padding: "var(--s-5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-4)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-h1">{e.t}</div>
                  <div
                    className="t-body-2"
                    style={{ marginTop: "var(--s-1)" }}
                  >
                    {e.d}
                  </div>
                </div>
                {e.href && (
                  <span style={{ color: "var(--fg-3)" }}>→</span>
                )}
              </div>
            );
            return (
              <li key={e.t}>
                {e.href ? (
                  <Link
                    href={e.href}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <PublicFooter />
    </main>
  );
}
