"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TierLine {
  label: string;
  scanned: number;
  cap: number;
}

interface Props {
  eventId: string;
  eventName: string;
  nightId: string;
  initialScanned: number;
  totalCap: number;
  tiers: TierLine[];
}

const channelSuffix = () => Math.random().toString(36).slice(2, 10);

export default function WallClient({
  eventId,
  eventName,
  nightId,
  initialScanned,
  totalCap,
  tiers: initialTiers,
}: Props) {
  const [scanned, setScanned] = useState(initialScanned);
  const [tiers, setTiers] = useState<TierLine[]>(initialTiers);
  const [recent5min, setRecent5min] = useState(0);

  // Realtime: subscribe to check_ins for this night.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`door-wall-${nightId}-${channelSuffix()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "check_ins",
          filter: `event_night_id=eq.${nightId}`,
        },
        (payload) => {
          setScanned((s) => s + 1);
          // Track recent
          setRecent5min((n) => n + 1);
          window.setTimeout(() => setRecent5min((n) => Math.max(0, n - 1)), 5 * 60 * 1000);
          // Optimistically bump matching tier
          const row = payload.new as { state?: string };
          if (row.state === "approved") {
            setTiers((ts) => {
              if (ts.length === 0) return ts;
              return ts.map((t, i) => (i === 0 ? { ...t, scanned: t.scanned + 1 } : t));
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightId]);

  const pct = totalCap > 0 ? Math.min(100, Math.round((scanned / totalCap) * 100)) : 0;

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg)",
        padding: "var(--s-10)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-meta">{eventName} · TONIGHT · LIVE</div>
          <div
            className="t-num"
            style={{
              fontSize: "clamp(72px, 12vw, 144px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginTop: "var(--s-3)",
              lineHeight: 0.95,
            }}
          >
            {scanned}
            {totalCap > 0 ? (
              <span style={{ color: "var(--fg-3)" }}> / {totalCap}</span>
            ) : null}
          </div>
          <div
            className="t-body"
            style={{
              marginTop: "var(--s-3)",
              color: "var(--fg-2)",
              fontSize: 18,
            }}
          >
            {totalCap > 0 ? `${pct}% cap` : "live"} ·{" "}
            {recent5min === 0 ? "—" : `${recent5min}/5min`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <div
            className="pulse"
            style={{
              width: 16,
              height: 16,
              borderRadius: "var(--r-pill)",
              background: "var(--accent-1)",
              boxShadow: "0 0 24px rgba(255,61,110,0.6)",
            }}
          />
          <span className="chip chip--accent">LIVE</span>
        </div>
      </div>

      {tiers.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(tiers.length, 4)}, 1fr)`,
            gap: "var(--s-4)",
          }}
        >
          {tiers.map((t) => {
            const tpct = t.cap > 0 ? Math.round((t.scanned / t.cap) * 100) : 0;
            const tone = tpct >= 100 ? "warn" : tpct >= 80 ? "warn" : "ok";
            return (
              <div key={t.label} className="card" style={{ padding: "var(--s-6)" }}>
                <div className="t-meta">{t.label}</div>
                <div
                  className="t-num"
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    marginTop: "var(--s-3)",
                  }}
                >
                  {t.scanned}
                  {t.cap > 0 ? (
                    <span style={{ color: "var(--fg-3)" }}>/{t.cap}</span>
                  ) : null}
                </div>
                {t.cap > 0 && (
                  <span
                    className={`chip chip--${tone}`}
                    style={{ marginTop: "var(--s-3)", display: "inline-flex" }}
                  >
                    {tpct >= 100 ? "Full" : `${t.cap - t.scanned} left`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          color: "var(--fg-3)",
        }}
      >
        <span className="t-meta">EVENT {eventId.slice(0, 8)}</span>
        <span className="t-meta">PRESS F11 FOR FULLSCREEN</span>
      </div>
    </main>
  );
}
