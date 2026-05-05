import Link from "next/link";
import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";
import { IconArrow } from "@/components/wadl";

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

export default function DocsIndexPage() {
  return (
    <>
      <PublicShell maxWidth="4xl" ambient>
        <header style={{ marginBottom: 32 }}>
          <div className="w-type-meta">DOCS</div>
          <h1
            className="w-type-display-md"
            style={{ marginTop: 10, lineHeight: 0.94 }}
          >
            Integrations
          </h1>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 14,
              maxWidth: 560,
            }}
          >
            Hooks, embeds, calendar feeds, wallet passes — every entry point
            into a WADL door.
          </p>
        </header>

        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {ENTRIES.map((e) => {
            const inner = (
              <div
                className="w-card"
                style={{
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{e.t}</div>
                  <div
                    className="w-type-body-sm"
                    style={{
                      color: "var(--w-fg-muted)",
                      marginTop: 4,
                    }}
                  >
                    {e.d}
                  </div>
                </div>
                {e.href && (
                  <span
                    style={{
                      color: "var(--w-fg-dim)",
                    }}
                  >
                    <IconArrow />
                  </span>
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
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
