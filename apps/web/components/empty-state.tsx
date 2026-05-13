/**
 * Standard list-empty placeholder. v3 collapses the legacy mint/coral/gold
 * tones to a single accent ramp; the `tone` prop is kept for API compat.
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
  const toneColor: Record<string, string> = {
    mint: "var(--w-ok)",
    coral: "var(--w-err)",
    gold: "var(--w-warn)",
    muted: "var(--w-fg-muted)",
  };
  const color = toneColor[tone] ?? "var(--w-ok)";
  return (
    <div
      className="w-card"
      style={{
        padding: "32px 24px",
        textAlign: "center",
        borderColor: tone === "muted" ? "var(--w-line)" : color,
      }}
    >
      <div
        className="w-type-meta"
        style={{ color, marginBottom: 8 }}
      >
        {title.toUpperCase()}
      </div>
      {body && (
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            lineHeight: 1.5,
            maxWidth: 460,
            marginInline: "auto",
          }}
        >
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
