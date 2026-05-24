import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "About — WADL",
  description:
    "Built by people who run the door. WADL exists because the list at the door should not be a Google Sheet on someone's cracked iPhone.",
};

interface Pillar {
  h: string;
  d: string;
}

const PILLARS: Pillar[] = [
  { h: "Free, always", d: "No fees, no money on the platform. Wadl is free for everyone." },
  { h: "Quiet", d: "No carousels, no countdowns, no growth-hack pop-ups. Sentence case." },
  { h: "Door-first", d: "Built backward from a person scanning a phone in the dark." },
];

export default function AboutPage() {
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
          background: "var(--bg)",
          padding: "var(--s-16) var(--s-12)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">About</div>
        <h1
          className="t-display-xl"
          style={{ marginTop: "var(--s-3)", maxWidth: 820, lineHeight: 1.05 }}
        >
          Built by people
          <br />
          who run the door.
        </h1>
        <p
          className="t-body"
          style={{
            marginTop: "var(--s-5)",
            color: "var(--fg-2)",
            fontSize: 17,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          WADL exists because the list at the door should not be a Google Sheet
          on someone&apos;s cracked iPhone. We work nights in Miami. We&apos;ve
          fought every fight at every door. We&apos;re building the tool we
          needed.
        </p>

        <div
          style={{
            marginTop: "var(--s-12)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {PILLARS.map((p) => (
            <div key={p.h} className="card" style={{ padding: "var(--s-6)" }}>
              <div className="t-h1">{p.h}</div>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
              >
                {p.d}
              </p>
            </div>
          ))}
        </div>

        <section style={{ marginTop: "var(--s-16)", maxWidth: 720 }}>
          <div className="t-meta">Founder note</div>
          <h2
            className="t-display-md"
            style={{ marginTop: "var(--s-3)" }}
          >
            I work the door too.
          </h2>
          <div
            style={{
              marginTop: "var(--s-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-4)",
            }}
          >
            <p className="t-body">
              I&apos;m Jordy. I run nights in Miami. The list is a Google Sheet
              that becomes three Google Sheets that becomes a WhatsApp
              screenshot at the door. Fights start over names that aren&apos;t
              there. Promoters take credit for arrivals they didn&apos;t bring.
              The line stops moving.
            </p>
            <p className="t-body">
              WADL is the tool I needed. If you run nights, you know exactly
              what I mean.
            </p>
            <p className="t-body" style={{ fontWeight: 500 }}>
              — Jordy
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
