import Link from "next/link";
import { isDemoMode } from "@/lib/demo-mode";
import { enableDemoModeAction, disableDemoModeAction } from "./actions";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo mode — WADL" };

export default function DemoModePage() {
  const on = isDemoMode();

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div>
            <div className="w-type-meta">SALES TOOL</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6, lineHeight: 1.0 }}
            >
              Demo mode
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 520,
              }}
            >
              Pin a banner across every screen so anyone watching knows the
              data is sample data. Useful for screenshots, pitches, and walking
              a venue manager through the product without firing real SMS.
            </p>
          </div>
          <Logo size={18} />
        </header>

        <section
          className="w-card"
          style={{
            padding: 22,
            marginBottom: 14,
            borderColor: on ? "var(--w-acc)" : "var(--w-line)",
            background: on
              ? "var(--w-acc-soft)"
              : "var(--w-surface-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="w-type-meta">STATUS</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                  marginTop: 6,
                  color: on ? "var(--w-fg)" : "var(--w-fg-muted)",
                }}
              >
                {on ? "ON" : "OFF"}
              </div>
              <p className="w-type-meta" style={{ marginTop: 8 }}>
                COOKIE-SCOPED · DOESN&apos;T MODIFY DATA
              </p>
            </div>
            {on ? (
              <form action={disableDemoModeAction}>
                <button type="submit" className="btn btn--ghost btn--lg">
                  Turn demo mode off
                </button>
              </form>
            ) : (
              <form action={enableDemoModeAction}>
                <button type="submit" className="btn btn--lg">
                  Turn demo mode on
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="w-card" style={{ padding: 22, marginBottom: 14 }}>
          <div className="w-type-meta">SAMPLE DATASET</div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              marginBottom: 14,
            }}
          >
            Already an owner? Load 4 events + 12 promoters + ~200 guests into
            your account from the welcome wizard. Great for pitches.
          </p>
          <Link href="/welcome" style={{ textDecoration: "none" }}>
            <button type="button" className="btn btn--ghost">
              Open welcome wizard
            </button>
          </Link>
        </section>

        <section className="w-card" style={{ padding: 22 }}>
          <div className="w-type-meta">WHAT&apos;S MUTED IN DEMO MODE</div>
          <ul
            style={{
              padding: 0,
              listStyle: "none",
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 14,
              color: "var(--w-fg-muted)",
            }}
          >
            <li>
              · SMS sends still fire — toggle{" "}
              <code style={{ color: "var(--w-acc)" }}>DEV_MODE=true</code> to
              silence
            </li>
            <li>· Push notifications still fire</li>
            <li>· Stripe writes still fire</li>
          </ul>
          <div style={{ marginTop: 14 }}>
            <span className="chip chip--warn">
              VISUAL INDICATOR ONLY · HANDLE LIVE INTEGRATIONS FROM ENV
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
