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
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition disabled:opacity-50 ${
        enabled
          ? "border-mint bg-mint/10 text-mint hover:bg-mint/20"
          : "border-line bg-s2 text-muted hover:text-cream"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          enabled ? "bg-mint" : "bg-muted"
        }`}
      />
      {pending ? "…" : enabled ? "On" : "Off"}
    </button>
  );
}
