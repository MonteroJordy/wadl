import Link from "next/link";
import { PageHeader } from "@/components/v5";

export const metadata = { title: "You're set up — WADL" };

const STEPS: Array<{
  n: string;
  h: string;
  d: string;
  cta: string;
  href: string;
}> = [
  {
    n: "1",
    h: "Create your first event",
    d: "90 seconds · auto-publishes a public RSVP page.",
    cta: "Create event",
    href: "/owner/events/new",
  },
  {
    n: "2",
    h: "Add a credential tier",
    d: "GA · VIP · AAA · whatever you want. Caps + colors.",
    cta: "Add tier",
    href: "/owner/events/new",
  },
  {
    n: "3",
    h: "Invite your team or promoters",
    d: "Magic-link · no signup for them either.",
    cta: "Invite",
    href: "/owner/partners",
  },
];

export default function OnboardingDonePage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <PageHeader
        eyebrow="Welcome"
        title="Let's open your first door"
        sub="Three steps. No deadline. You can do them in any order."
        actions={
          <Link
            href="/owner"
            className="btn btn--ghost"
            style={{ textDecoration: "none" }}
          >
            Skip to dashboard
          </Link>
        }
      />

      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {STEPS.map((s, idx) => (
            <div key={s.n} className="card" style={{ padding: "var(--s-5)" }}>
              <span className="t-meta">Step {s.n}</span>
              <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
                {s.h}
              </div>
              <div
                className="t-body-2"
                style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
              >
                {s.d}
              </div>
              <Link
                href={s.href}
                className={`btn btn--block ${idx === 0 ? "btn--accent" : ""}`}
                style={{
                  marginTop: "var(--s-4)",
                  textDecoration: "none",
                }}
              >
                {s.cta}
              </Link>
            </div>
          ))}
        </div>

        <div
          className="card"
          style={{
            marginTop: "var(--s-6)",
            padding: "var(--s-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="t-h2">Need help?</div>
            <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
              90-second walkthrough · or message us
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--s-2)" }}>
            <Link
              href="/docs"
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
            >
              Walkthrough
            </Link>
            <Link
              href="/contact"
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
            >
              Message
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
