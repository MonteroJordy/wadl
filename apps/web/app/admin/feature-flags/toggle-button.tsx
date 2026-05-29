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
      className={"chip " + (enabled ? "chip--ok" : "chip--ghost")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--s-2)",
        cursor: "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <span className={"dot" + (enabled ? " dot--ok" : "")} />
      {pending ? "…" : enabled ? "On" : "Off"}
    </button>
  );
}
