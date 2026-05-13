"use client";

import { useTransition } from "react";
import { toggleFeatureFlagAction } from "./actions";

export default function ToggleButton({
  flagKey,
  enabled,
}: {
  flagKey: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await toggleFeatureFlagAction(flagKey);
        });
      }}
      disabled={pending}
      aria-label={`Toggle ${flagKey}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px",
        border: `1px solid ${enabled ? "var(--w-ok)" : "var(--w-line)"}`,
        background: enabled ? "var(--w-acc-soft)" : "var(--w-surface-2)",
        color: enabled ? "var(--w-ok)" : "var(--w-fg-muted)",
        fontFamily: "var(--w-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: enabled ? "var(--w-ok)" : "var(--w-fg-muted)",
        }}
      />
      {pending ? "…" : enabled ? "On" : "Off"}
    </button>
  );
}
