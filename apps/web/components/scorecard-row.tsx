import Link from "next/link";
import type { HolderScorecard } from "@/lib/scorecards";

const GRADE_COLOR: Record<HolderScorecard["grade"], string> = {
  A: "var(--w-ok)",
  B: "var(--w-fg)",
  C: "var(--w-warn)",
  D: "var(--w-err)",
};

export default function ScorecardRow({
  card,
  rank,
  href,
}: {
  card: HolderScorecard;
  rank: number;
  href?: string;
}) {
  const trendGlyph =
    card.trend === "up"
      ? "↑"
      : card.trend === "down"
        ? "↓"
        : card.trend === "flat"
          ? "→"
          : "";
  const trendColor =
    card.trend === "up"
      ? "var(--w-ok)"
      : card.trend === "down"
        ? "var(--w-err)"
        : "var(--w-fg-muted)";
  const gradeColor = GRADE_COLOR[card.grade];

  const body = (
    <div className="w-card" style={{ padding: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              color: "var(--w-fg)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span
              style={{
                color: "var(--w-fg-muted)",
                fontFamily: "var(--w-mono)",
                fontSize: 12,
                marginRight: 4,
              }}
            >
              {rank}.
            </span>
            {card.display_name}
          </p>
          <div className="w-type-meta" style={{ marginTop: 4 }}>
            <span style={{ color: "var(--w-ok)" }}>{card.scanned}</span> /{" "}
            {card.approved} SCANNED · {card.events_played} EVENT
            {card.events_played === 1 ? "" : "S"}
            {trendGlyph && (
              <span style={{ marginLeft: 8, color: trendColor }}>
                {trendGlyph}
              </span>
            )}
          </div>
          <div
            className="w-type-meta"
            style={{ display: "flex", gap: 8, marginTop: 6 }}
          >
            {card.tier_mix.all_access > 0 && (
              <span style={{ color: "var(--w-acc)" }}>
                AA {card.tier_mix.all_access}
              </span>
            )}
            {card.tier_mix.vip > 0 && (
              <span style={{ color: "var(--w-warn)" }}>
                VIP {card.tier_mix.vip}
              </span>
            )}
            {card.tier_mix.ga > 0 && (
              <span style={{ color: "var(--w-fg-muted)" }}>
                GA {card.tier_mix.ga}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1,
              color: "var(--w-fg)",
            }}
          >
            {Math.round(card.show_rate * 100)}%
          </div>
          <span
            className="w-type-meta"
            style={{
              display: "inline-block",
              padding: "2px 10px",
              marginTop: 6,
              border: `1px solid ${gradeColor}`,
              color: gradeColor,
            }}
          >
            {card.grade}
          </span>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
