import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import {
  Avatar,
  Chip,
  CredPill,
  IconArrow,
} from "@/components/wadl";

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">
              SCORECARDS · CROSS-EVENT
            </div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 8 }}
            >
              Promoter leaderboard
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              Sorted by show rate, then volume. Per-tier conversion is the
              wedge — promoter ranking the data product nobody else has.
            </p>
          </div>
          <Link href="/owner" style={{ textDecoration: "none" }}>
            <Chip tone="ghost">← EVENTS</Chip>
          </Link>
        </div>

        {/* Aggregate KPI strip */}
        {cards.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginTop: 24,
            }}
          >
            <KPI
              eyebrow="HOLDERS RANKED"
              big={String(cards.length)}
              sub="cross-event"
            />
            <KPI
              eyebrow="HEADS APPROVED"
              big={String(totalApproved)}
              sub={`${totalScanned} scanned in`}
            />
            <KPI
              eyebrow="POOL SHOW RATE"
              big={`${aggRate}%`}
              sub="across visible holders"
              accent
            />
          </div>
        )}

        {/* Empty state */}
        {cards.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 28,
            }}
          >
            <div className="w-type-h1">Run a night first</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              Holders rank here by show rate after the first event with
              check-ins. The harder the door, the sharper the grade.
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {cards.map((c, i) => (
              <ScorecardCard
                key={c.key}
                card={c}
                rank={i + 1}
                href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function KPI({
  eyebrow,
  big,
  sub,
  accent,
}: {
  eyebrow: string;
  big: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{eyebrow}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: "-0.025em",
          marginTop: 6,
          lineHeight: 1,
        }}
      >
        {big}
      </div>
      {sub && (
        <div
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  card: import("@/lib/scorecards").HolderScorecard;
  rank: number;
  href: string;
}

function ScorecardCard({ card, rank, href }: CardProps) {
  const showRatePct = Math.round(card.show_rate * 100);
  const gradeBg =
    card.grade === "A"
      ? "var(--w-ok)"
      : card.grade === "B"
        ? "var(--w-acc)"
        : card.grade === "C"
          ? "var(--w-warn)"
          : "var(--w-err)";
  const gradeFg = card.grade === "B" ? "var(--w-acc-ink)" : "var(--w-ink)";

  return (
    <Link
      href={href}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        className="w-card"
        style={{
          padding: 18,
          display: "flex",
          alignItems: "stretch",
          gap: 16,
        }}
      >
        {/* Rank + Avatar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            className="w-type-meta"
            style={{ color: "var(--w-fg-dim)" }}
          >
            #{String(rank).padStart(2, "0")}
          </div>
          <Avatar name={card.display_name} size={40} />
        </div>

        {/* Name + per-tier breakdown */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 16,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {card.display_name}
            </span>
            {card.trend === "up" && <Chip tone="ok">↑ TRENDING UP</Chip>}
            {card.trend === "down" && (
              <Chip tone="warn">↓ TRENDING DOWN</Chip>
            )}
          </div>
          <div className="w-type-meta" style={{ marginTop: 4 }}>
            {card.events_played} EVENT
            {card.events_played === 1 ? "" : "S"} · {card.scanned}/
            {card.approved} HEADS
          </div>

          {/* Per-tier conversion — the wedge */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <TierStat tier="GA" stat={card.tier_rates.ga} />
            <TierStat tier="VIP" stat={card.tier_rates.vip} />
            <TierStat tier="AAA" stat={card.tier_rates.aaa} />
          </div>
        </div>

        {/* Grade tile */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: gradeBg,
              color: gradeFg,
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "-0.025em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {card.grade}
          </div>
          <div
            className="w-type-meta"
            style={{ color: "var(--w-fg)" }}
          >
            {showRatePct}%
          </div>
          <Chip tone="ghost">
            <IconArrow size={12} />
          </Chip>
        </div>
      </div>
    </Link>
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
          gap: 6,
          opacity: 0.45,
        }}
      >
        <CredPill tier={tier} />
        <span
          className="w-type-meta"
          style={{ color: "var(--w-fg-dim)" }}
        >
          —
        </span>
      </div>
    );
  }
  const pct = Math.round(stat.rate * 100);
  const color =
    pct >= 80
      ? "var(--w-ok)"
      : pct >= 60
        ? "var(--w-fg)"
        : "var(--w-warn)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <CredPill tier={tier} />
      <span
        className="w-type-num"
        style={{
          fontSize: 13,
          color,
          fontWeight: 600,
        }}
      >
        {pct}%
      </span>
      <span
        className="w-type-meta"
        style={{ color: "var(--w-fg-dim)" }}
      >
        {stat.scanned}/{stat.approved}
      </span>
    </div>
  );
}
