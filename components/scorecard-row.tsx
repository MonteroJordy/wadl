import Link from "next/link";
import type { HolderScorecard } from "@/lib/scorecards";

const GRADE_COLOR: Record<HolderScorecard["grade"], string> = {
  A: "text-mint border-mint/40 bg-mint/10",
  B: "text-cream border-cream/40 bg-cream/10",
  C: "text-gold border-gold/40 bg-gold/10",
  D: "text-coral border-coral/40 bg-coral/10",
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
    card.trend === "up" ? "↑" : card.trend === "down" ? "↓" : card.trend === "flat" ? "→" : "";
  const trendColor =
    card.trend === "up" ? "text-mint" : card.trend === "down" ? "text-coral" : "text-muted";

  const body = (
    <div className="card hover:border-coral/60 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-cream font-semibold truncate">
            <span className="text-muted">{rank}.</span> {card.display_name}
          </p>
          <p className="label-mono mt-1">
            <span className="text-mint">{card.scanned}</span> / {card.approved}{" "}
            scanned · {card.events_played} event
            {card.events_played === 1 ? "" : "s"}
            {trendGlyph && (
              <span className={`ml-2 ${trendColor}`}>{trendGlyph}</span>
            )}
          </p>
          <div className="flex gap-2 mt-2 label-mono">
            {card.tier_mix.all_access > 0 && (
              <span className="text-lav">AA {card.tier_mix.all_access}</span>
            )}
            {card.tier_mix.vip > 0 && (
              <span className="text-gold">VIP {card.tier_mix.vip}</span>
            )}
            {card.tier_mix.ga > 0 && (
              <span className="text-muted">GA {card.tier_mix.ga}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-3xl leading-none text-cream">
            {Math.round(card.show_rate * 100)}%
          </p>
          <span
            className={`label-mono inline-block px-2 py-0.5 mt-2 rounded-full border ${GRADE_COLOR[card.grade]}`}
          >
            {card.grade}
          </span>
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href}>{body}</Link>
  ) : (
    <div>{body}</div>
  );
}
