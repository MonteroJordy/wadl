import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Status — WADL",
  description: "Live status of WADL services.",
};

interface SystemLine {
  name: string;
  status: "operational" | "degraded" | "down";
}

const SYSTEMS: SystemLine[] = [
  { name: "App & dashboard", status: "operational" },
  { name: "Door scanner", status: "operational" },
  { name: "API & webhooks", status: "operational" },
  { name: "SMS delivery", status: "operational" },
  { name: "Public event pages", status: "operational" },
];

const STATUS_LABEL: Record<SystemLine["status"], string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

const STATUS_TONE: Record<SystemLine["status"], string> = {
  operational: "chip--ok",
  degraded: "chip--warn",
  down: "chip--err",
};

const STATUS_BAR_COLOR: Record<SystemLine["status"], string> = {
  operational: "var(--ok)",
  degraded: "var(--warn)",
  down: "var(--err)",
};

export default function StatusPage() {
  const allOk = SYSTEMS.every((s) => s.status === "operational");
  // 60-day uptime sparkline (deterministic; cells colored by global state).
  const bars = Array.from({ length: 60 });

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
            "radial-gradient(circle at 95% 5%, rgba(74,222,128,0.04) 0%, transparent 40%), var(--bg)",
          padding: "var(--s-12)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Status</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            marginTop: "var(--s-3)",
          }}
        >
          <div
            className="pulse"
            style={{
              width: 10,
              height: 10,
              borderRadius: "var(--r-pill)",
              background: allOk ? "var(--ok)" : "var(--warn)",
            }}
          />
          <span className="t-display-md">
            {allOk ? "All systems normal" : "Investigating"}
          </span>
        </div>
        <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          Last incident · 11 days ago
        </div>

        <div style={{ marginTop: "var(--s-8)" }}>
          {SYSTEMS.map((s, i) => (
            <div
              key={s.name}
              style={{
                padding: "var(--s-4) 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--s-4)",
                borderTop: "1px solid var(--line)",
                borderBottom: i === SYSTEMS.length - 1 ? "1px solid var(--line)" : "none",
                flexWrap: "wrap",
              }}
            >
              <span className="t-h1">{s.name}</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-3)",
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {bars.map((_, j) => (
                    <div
                      key={j}
                      style={{
                        width: 5,
                        height: 22,
                        background: STATUS_BAR_COLOR[s.status],
                        opacity: 0.5 + (j / 60) * 0.5,
                      }}
                    />
                  ))}
                </div>
                <span className={`chip ${STATUS_TONE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p
          className="t-meta"
          style={{ marginTop: "var(--s-10)", color: "var(--fg-3)" }}
        >
          Subscribe at <a href="mailto:status@wadl.app" style={{ color: "var(--fg)" }}>status@wadl.app</a> for incident updates.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
