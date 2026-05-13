import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

const GRADE_COLOR: Record<string, string> = {
  A: "var(--w-ok)",
  B: "var(--w-fg)",
  C: "var(--w-warn)",
  D: "var(--w-err)",
};

export default async function HolderDetailPage({
  params,
}: {
  params: { holderId: string };
}) {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);
  const holderKey = decodeURIComponent(params.holderId);
  const card = cards.find((c) => c.key === holderKey);
  if (!card) notFound();

  const total =
    card.tier_mix.ga + card.tier_mix.vip + card.tier_mix.all_access;

  const tiers = [
    { id: "ga" as const, label: "GA", color: "var(--w-fg-muted)" },
    { id: "vip" as const, label: "VIP", color: "var(--w-acc)" },
    {
      id: "all_access" as const,
      label: "ALL ACCESS",
      color: "var(--w-ok)",
    },
  ];

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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/owner/scorecards"
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← LEADERBOARD
        </Link>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">HOLDER</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            {card.display_name}
          </div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {card.events_played} EVENT{card.events_played === 1 ? "" : "S"} ·
            GRADE{" "}
            <span
              style={{
                color: GRADE_COLOR[card.grade] ?? "var(--w-fg)",
                fontFamily: "var(--w-display)",
                fontWeight: 700,
              }}
            >
              {card.grade}
            </span>
          </p>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <section
            className="w-card"
            style={{
              padding: 24,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div className="w-type-meta">SHOW RATE</div>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 72,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginTop: 8,
                color: "var(--w-acc-ink)",
              }}
            >
              {Math.round(card.show_rate * 100)}%
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 18,
              }}
            >
              <div>
                <div className="w-type-meta">APPROVED</div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1,
                    marginTop: 6,
                    color: "var(--w-acc-ink)",
                  }}
                >
                  {card.approved}
                </div>
              </div>
              <div>
                <div className="w-type-meta">SCANNED IN</div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1,
                    marginTop: 6,
                    color: "var(--w-ok)",
                  }}
                >
                  {card.scanned}
                </div>
              </div>
            </div>
          </section>

          {total > 0 && (
            <section className="w-card" style={{ padding: 20 }}>
              <div className="w-type-meta" style={{ marginBottom: 14 }}>
                TIER MIX
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {tiers.map((t) => {
                  const v = card.tier_mix[t.id];
                  const pct = total === 0 ? 0 : (v / total) * 100;
                  return (
                    <div key={t.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <p style={{ color: "var(--w-fg)" }}>{t.label}</p>
                        <div
                          className="w-type-meta"
                          style={{ fontFamily: "var(--w-mono)" }}
                        >
                          {v}
                        </div>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "var(--w-surface-3)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: t.color,
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {card.trend && (
            <section className="w-card" style={{ padding: 20 }}>
              <div className="w-type-meta" style={{ marginBottom: 6 }}>
                TREND
              </div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 28,
                  lineHeight: 1,
                  letterSpacing: "-0.025em",
                }}
              >
                {card.trend === "up" && (
                  <span style={{ color: "var(--w-ok)" }}>↑ Improving</span>
                )}
                {card.trend === "down" && (
                  <span style={{ color: "var(--w-err)" }}>↓ Slipping</span>
                )}
                {card.trend === "flat" && (
                  <span style={{ color: "var(--w-fg-muted)" }}>→ Steady</span>
                )}
              </div>
              <div
                className="w-type-meta"
                style={{ marginTop: 8, color: "var(--w-fg-dim)" }}
              >
                VS. THEIR PREVIOUS EVENT
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
