/**
 * Standard list-empty placeholder. Mint-accented across the app (brief §10
 * assigns mint to door staff; Day 6 reuses it as a neutral positive accent
 * for empty lists so the UI feels alive even with zero data).
 */
export default function EmptyState({
  title,
  body,
  action,
  tone = "mint",
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  tone?: "mint" | "coral" | "gold" | "muted";
}) {
  const toneMap: Record<string, string> = {
    mint:   "border-mint/40 text-mint",
    coral:  "border-coral/40 text-coral",
    gold:   "border-gold/40 text-gold",
    muted:  "border-line text-muted",
  };
  return (
    <div className={`card text-center ${toneMap[tone]}`}>
      <p className="label-mono mb-2">{title}</p>
      {body && <p className="text-muted text-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
