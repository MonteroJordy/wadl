import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = { title: "You're set up — WADL" };

const STEPS = ["Identity", "Branding", "Payments", "Invite"] as const;

export default function OnboardingDonePage() {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--w-line)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Logo size={18} />
          <span
            className="w-type-meta"
            style={{ color: "var(--w-fg-dim)" }}
          >
            · SETUP
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            fontFamily: "var(--w-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
          }}
        >
          {STEPS.map((s, i) => (
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                color: "var(--w-acc)",
              }}
            >
              {i + 1}.{s.toUpperCase()}
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    width: 24,
                    height: 1,
                    background: "var(--w-line-2)",
                    margin: "0 10px",
                  }}
                />
              )}
            </span>
          ))}
        </div>
        <Link
          href="/owner"
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          SAVE & EXIT
        </Link>
      </header>

      <div
        style={{
          flex: 1,
          padding: "60px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            background: "var(--w-acc)",
            color: "var(--w-acc-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontFamily: "var(--w-display)",
            fontWeight: 700,
            fontSize: "clamp(48px, 7vw, 72px)",
            letterSpacing: "-0.04em",
            marginTop: 28,
            lineHeight: 0.95,
          }}
        >
          You&apos;re set up.
          <br />
          <span
            style={{
              background: "var(--w-acc)",
              color: "var(--w-acc-ink)",
              padding: "0 14px",
              display: "inline-block",
            }}
          >
            Now go run a door.
          </span>
        </div>
        <p
          className="w-type-body"
          style={{
            color: "var(--w-fg-muted)",
            fontSize: 17,
            marginTop: 24,
            lineHeight: 1.55,
            maxWidth: 560,
          }}
        >
          Your venue is live. Your first event template is ready. Time-to-published RSVP page:{" "}
          <span
            style={{ color: "var(--w-fg)", fontFamily: "var(--w-mono)" }}
          >
            0:09:42
          </span>
          .
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 48,
            maxWidth: 720,
            width: "100%",
          }}
        >
          {[
            {
              t: "CREATE FIRST EVENT",
              s: "It takes 90s",
              hot: true,
              href: "/owner/events/new",
            },
            {
              t: "PAIR A DOOR DEVICE",
              s: "iPhone or ScanPro",
              hot: false,
              href: "/door",
            },
            {
              t: "IMPORT GUEST CSV",
              s: "Optional",
              hot: false,
              href: "/owner",
            },
          ].map((c) => (
            <Link
              key={c.t}
              href={c.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: c.hot ? "var(--w-fg)" : "transparent",
                  color: c.hot ? "var(--w-bg)" : "var(--w-fg)",
                  border: c.hot ? "none" : "1px solid var(--w-line-2)",
                  padding: "20px 18px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  className="w-type-meta"
                  style={{
                    color: c.hot ? "var(--w-bg)" : "var(--w-fg-muted)",
                  }}
                >
                  {c.t}
                </div>
                <div style={{ fontSize: 14, marginTop: 8 }}>
                  {c.s} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
