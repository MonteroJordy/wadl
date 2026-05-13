"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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
        <Button variant="ghost" type="button" onClick={() => setOpen(true)}>
          Change tier
        </Button>
        {saved && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)", marginTop: 8 }}
          >
            {saved}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-card" style={{ padding: 14 }}>
      <div className="w-type-meta" style={{ marginBottom: 12 }}>
        PICK A NEW TIER
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {TIERS.map((t) => {
          const active = t === currentTier;
          return (
            <button
              key={t}
              type="button"
              onClick={() => tryUpgrade(t)}
              disabled={pending || active}
              style={{
                padding: 10,
                border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
                background: active
                  ? "var(--w-acc-soft)"
                  : "var(--w-surface-1)",
                color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                fontFamily: "var(--w-mono)",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: pending || active ? "default" : "pointer",
                opacity: pending && !active ? 0.5 : 1,
              }}
            >
              {t.replace("_", " ")}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-type-meta"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--w-fg-muted)",
          padding: 0,
        }}
      >
        CANCEL
      </button>
      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 8 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
