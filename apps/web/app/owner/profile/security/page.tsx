import Link from "next/link";
import { Button, Chip, IconArrow, QRBlock } from "@/components/wadl";

export const metadata = { title: "Security — WADL" };

const STEPS = [
  { n: "1", t: "Scan the QR with your TOTP app", done: true },
  { n: "2", t: "Enter the 6-digit code your app shows", done: true },
  { n: "3", t: "Save your 8 recovery codes", done: false },
];

export default function SecurityPage() {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="w-type-meta">SECURITY · TWO-FACTOR AUTH</div>
        <div className="w-type-display-md" style={{ marginTop: 6 }}>
          Set up 2FA
        </div>
        <p
          className="w-type-body"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 560,
          }}
        >
          Required to move money, change payouts, or invite an owner. Use any
          TOTP app — 1Password, Authy, Google Authenticator.
        </p>

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 32,
            maxWidth: 920,
          }}
        >
          {/* Steps + verify */}
          <div>
            <div className="w-type-meta">STEPS</div>
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: "1px solid var(--w-line)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: s.done
                      ? "var(--w-acc)"
                      : "#ffffff10",
                    color: s.done
                      ? "var(--w-acc-ink)"
                      : "var(--w-fg-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--w-mono)",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {s.done ? "✓" : s.n}
                </div>
                <div style={{ flex: 1, fontSize: 14, paddingTop: 4 }}>
                  {s.t}
                </div>
              </div>
            ))}

            <div className="w-type-meta" style={{ marginTop: 32 }}>
              VERIFY · ENTER 6-DIGIT CODE
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 12,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-input"
                  style={{
                    width: 52,
                    height: 64,
                    padding: 0,
                    textAlign: "center",
                    fontFamily: "var(--w-mono)",
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <Link
                href="/owner/profile/recovery"
                style={{ textDecoration: "none" }}
              >
                <Button variant="primary">
                  Verify & continue <IconArrow size={14} />
                </Button>
              </Link>
            </div>
          </div>

          {/* QR */}
          <div>
            <div className="w-type-meta">SCAN THIS</div>
            <div
              style={{
                marginTop: 12,
                padding: 24,
                background: "var(--w-fg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QRBlock size={220} seed="WADL-2FA-SETUP" />
            </div>
            <div
              className="w-type-meta"
              style={{
                marginTop: 14,
                color: "var(--w-fg-muted)",
              }}
            >
              OR ENTER MANUALLY
            </div>
            <div
              style={{
                marginTop: 8,
                padding: "12px 14px",
                background: "var(--w-ink)",
                border: "1px solid var(--w-line)",
                fontFamily: "var(--w-mono)",
                fontSize: 13,
                letterSpacing: "0.05em",
              }}
            >
              JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK
            </div>

            <div style={{ marginTop: 20 }}>
              <Chip tone="warn">
                STORE THE SECRET WHERE YOUR PASSWORD MANAGER WILL FIND IT
              </Chip>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
