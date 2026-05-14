import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import { PageHeader, Stat } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scorecards — WADL" };

export default async function ScorecardsPage() {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);

  // Aggregate banner. Sum approved / scanned across all visible holders.
  const totalApproved = cards.reduce((s, c) => s + c.approved, 0);
  const totalScanned = cards.reduce((s, c) => s + c.scanned, 0);
  const aggRate =
    totalApproved === 0 ? 0 : Math.round((totalScanned / totalApproved) * 100);

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PageHeader
        eyebrow="Scorecards · cross-event"
        title="Promoter leaderboard"
        sub="Sorted by show rate, then volume. Per-tier conversion is the wedge — promoter ranking the data product nobody else has."
      />

      {cards.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Stat
            label="Holders ranked"
            value={String(cards.length)}
            sub="cross-event"
          />
          <Stat
            label="Heads approved"
            value={String(totalApproved)}
            sub={`${totalScanned} scanned in`}
          />
          <Stat
            label="Pool show rate"
            value={`${aggRate}%`}
            sub="across visible holders"
            last
          />
        </div>
      )}

      <div style={{ padding: "var(--s-8)" }}>
        {cards.length === 0 ? (
          <div
            style={{
              padding: "var(--s-20) var(--s-8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--r-lg)",
                background: "var(--bg-3)",
                marginBottom: "var(--s-5)",
              }}
            />
            <div className="t-display-md">Run a night first</div>
            <div
              className="t-body-2"
              style={{ marginTop: "var(--s-3)", maxWidth: 380 }}
            >
              Holders rank here by show rate after the first event with
              check-ins. The harder the door, the sharper the grade.
            </div>
          </div>
        ) : (
          <div className="card">
            {cards.map((c, i) => {
              const showRatePct = Math.round(c.show_rate * 100);
              const gradeColor =
                c.grade === "A"
                  ? "var(--ok)"
                  : c.grade === "B"
                    ? "var(--info)"
                    : c.grade === "C"
                      ? "var(--warn)"
                      : "var(--err)";
              return (
                <Link
                  key={c.key}
                  href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
                  className="row"
                  style={{
                    gridTemplateColumns:
                      "44px 1fr 220px 90px 64px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {/* Rank */}
                  <span
                    className="t-meta t-num"
                    style={{ color: "var(--fg-3)" }}
                  >
                    #{String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Name + meta */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--s-2)",
                      }}
                    >
                      <span className="t-h1 truncate">
                        {c.display_name}
                      </span>
                      {c.trend === "up" && (
                        <span className="chip chip--ok">↑ Up</span>
                      )}
                      {c.trend === "down" && (
                        <span className="chip chip--warn">↓ Down</span>
                      )}
                    </div>
                    <div
                      className="t-meta"
                      style={{ marginTop: "var(--s-1)" }}
                    >
                      {c.events_played} event
                      {c.events_played === 1 ? "" : "s"} · {c.scanned}/
                      {c.approved} heads
                    </div>
                  </div>

                  {/* Per-tier conversion — the wedge */}
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--s-3)",
                      flexWrap: "wrap",
                    }}
                  >
                    <TierStat tier="GA" stat={c.tier_rates.ga} />
                    <TierStat tier="VIP" stat={c.tier_rates.vip} />
                    <TierStat tier="AAA" stat={c.tier_rates.aaa} />
                  </div>

                  {/* Show rate */}
                  <span className="t-h2 t-num">{showRatePct}%</span>

                  {/* Grade tile */}
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--r-md)",
                      background: gradeColor,
                      color: "var(--bg)",
                      fontFamily: "var(--display)",
                      fontWeight: 700,
                      fontSize: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.grade}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function TierStat({
  tier,
  stat,
}: {
  tier: "GA" | "VIP" | "AAA";
  stat: { approved: number; scanned: number; rate: number } | null;
}) {
  if (!stat) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-1)",
          opacity: 0.4,
        }}
      >
        <span className="chip chip--ghost">{tier}</span>
        <span className="t-meta">—</span>
      </div>
    );
  }
  const pct = Math.round(stat.rate * 100);
  const color =
    pct >= 80
      ? "var(--ok)"
      : pct >= 60
        ? "var(--fg)"
        : "var(--warn)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--s-1)",
      }}
    >
      <span className="chip chip--ghost">{tier}</span>
      <span
        className="t-body-2 t-num"
        style={{ color, fontWeight: 600 }}
      >
        {pct}%
      </span>
      <span className="t-meta">
        {stat.scanned}/{stat.approved}
      </span>
    </div>
  );
}
