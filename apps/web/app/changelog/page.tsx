import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Changelog — WADL",
  description: "What's new at WADL.",
};

interface Entry {
  date: string;
  items: string[];
}

const ENTRIES: Entry[] = [
  {
    date: "May 22 2026",
    items: [
      "Door scanner V2: clean iOS shell, color-banded result overlay, manual-lookup list inline.",
      "Door manager: live walk-in capture, no-show + tier-adjust per row.",
      "Guestless RSVP: name + phone → pass, no account required.",
      "Recognition: past-guest auto-recognition + optional mid-RSVP sign-in.",
    ],
  },
  {
    date: "May 14 2026",
    items: [
      "Per-tier credential editor on event creation (GA / VIP / AAA / custom + caps).",
      "Cover image 4:5 upload with soft aspect-ratio warn.",
      "Event timeline: scan + broadcast feed for each night.",
    ],
  },
  {
    date: "May 12 2026",
    items: [
      "Door scanner: offline queue raised to 2,000 scans.",
      "Friend graph on credential detail.",
      "Aggregate analytics: credential mix + top promoters.",
    ],
  },
  {
    date: "May 04 2026",
    items: [
      "Strikes no longer propagate across venues by default.",
      "Scanned-in friend signal on event pages.",
      "Post-event report at /owner/events/[id]/report.",
    ],
  },
  {
    date: "Apr 28 2026",
    items: [
      "Co-host invites: counter button on the invite landing.",
      "CSV import auto-detects E.164 phone formatting.",
      "Public venue profile pages at /v/[id].",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <header
        style={{
          padding: "var(--s-4) var(--s-6)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </header>

      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 95% 5%, rgba(255,210,61,0.05) 0%, transparent 40%), var(--bg)",
          padding: "var(--s-16) var(--s-12)",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Changelog</div>
        <h1
          className="t-display-xl"
          style={{ marginTop: "var(--s-3)" }}
        >
          What&apos;s new
        </h1>

        <div style={{ marginTop: "var(--s-10)" }}>
          {ENTRIES.map((e) => (
            <article
              key={e.date}
              style={{
                padding: "var(--s-6) 0",
                borderTop: "1px solid var(--line)",
              }}
            >
              <div className="t-meta">{e.date}</div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginTop: "var(--s-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                {e.items.map((it) => (
                  <li
                    key={it}
                    className="t-body"
                    style={{
                      display: "flex",
                      gap: "var(--s-3)",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ color: "var(--fg-4)" }}>·</span>
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
