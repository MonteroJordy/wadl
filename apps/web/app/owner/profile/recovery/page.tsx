import Link from "next/link";
import { Button, Chip, Wordmark } from "@/components/wadl";

export const metadata = { title: "Recovery codes — WADL" };

// Stub codes for the design preview. Real codes are generated server-side
// when 2FA setup completes.
const CODES = [
  "8j4k-92qx",
  "m1nq-7wfp",
  "vt3r-aldn",
  "xpbz-04gy",
  "q72v-jkrh",
  "6m4d-tnex",
  "rb1l-9ce2",
  "8h0u-7yvk",
];

export default function RecoveryCodesPage() {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          padding: 32,
          background: "var(--w-surface-2)",
          border: "2px solid var(--w-warn)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Wordmark variant="monogrid" size={16} />
          <Chip tone="warn">SAVE THESE NOW · SHOWN ONCE</Chip>
        </div>

        <div
          style={{
            fontFamily: "var(--w-display)",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.02em",
            marginTop: 14,
          }}
        >
          Your recovery codes
        </div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 8,
            lineHeight: 1.55,
          }}
        >
          If you lose your phone, any of these gets you back in. Each works
          once.
        </p>

        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "var(--w-ink)",
            border: "1px solid var(--w-line)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              fontFamily: "var(--w-mono)",
              fontSize: 14,
            }}
          >
            {CODES.map((c, i) => (
              <div key={c} style={{ display: "flex", gap: 10 }}>
                <span
                  style={{
                    color: "var(--w-fg-dim)",
                    width: 22,
                  }}
                >
                  {i + 1}.
                </span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 20,
          }}
        >
          <Button variant="ghost" block>
            Copy all
          </Button>
          <Button variant="ghost" block>
            Download .txt
          </Button>
        </div>

        <Link
          href="/owner/profile"
          style={{ textDecoration: "none" }}
        >
          <Button
            variant="primary"
            size="lg"
            block
            style={{ marginTop: 12 }}
          >
            I&apos;ve saved them — finish
          </Button>
        </Link>
      </div>
    </main>
  );
}
