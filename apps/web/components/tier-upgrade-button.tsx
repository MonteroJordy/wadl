"use client";

import { useState, useTransition } from "react";
import { upgradeTierAction, type Tier } from "@/lib/guest-extras";

const TIERS: Tier[] = ["ga", "vip", "all_access"];

export default function TierUpgradeButton({
  guestId,
  currentTier,
}: {
  guestId: string;
  currentTier: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function tryUpgrade(t: Tier) {
    if (t === currentTier) return;
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await upgradeTierAction(guestId, t);
      if (!res.ok) setError(res.error);
      else {
        setSaved(`Upgraded to ${t.replace("_", " ").toUpperCase()}. SMS sent.`);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-ghost"
        >
          Change tier
        </button>
        {saved && <p className="text-mint text-sm mt-2">{saved}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <p className="label-mono mb-3">Pick a new tier</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {TIERS.map((t) => {
          const active = t === currentTier;
          return (
            <button
              key={t}
              type="button"
              onClick={() => tryUpgrade(t)}
              disabled={pending || active}
              className={`border rounded-md px-2 py-2 font-mono text-xs uppercase tracking-wider transition disabled:opacity-50 ${
                active
                  ? "border-coral bg-coral/10 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="label-mono text-muted hover:text-cream transition"
      >
        Cancel
      </button>
      {error && <p className="text-err text-sm mt-2">{error}</p>}
    </div>
  );
}
