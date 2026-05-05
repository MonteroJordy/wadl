import * as React from "react";

interface CapacityMeterProps {
  current: number;
  total: number;
  accent?: boolean;
  label?: string;
}

export function CapacityMeter({
  current,
  total,
  accent = false,
  label = "CAPACITY",
}: CapacityMeterProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span className="w-type-meta">{label}</span>
        <span
          style={{
            fontFamily: "var(--w-mono)",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <b style={{ color: "var(--w-fg)", fontWeight: 600 }}>{current}</b>
          <span style={{ color: "var(--w-fg-dim)" }}> / {total}</span>
        </span>
      </div>
      <div className={`w-meter ${accent ? "w-meter--acc" : ""}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface TieredMeterProps {
  ga: number;
  gaTotal: number;
  vip: number;
  vipTotal: number;
  aaa: number;
  aaaTotal: number;
}

export function TieredMeter({
  ga,
  gaTotal,
  vip,
  vipTotal,
  aaa,
  aaaTotal,
}: TieredMeterProps) {
  const total = gaTotal + vipTotal + aaaTotal;
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          background: "#ffffff0c",
        }}
      >
        <div style={{ width: `${seg(ga)}%`, background: "var(--w-fg)" }} />
        <div style={{ width: `${seg(vip)}%`, background: "var(--w-acc)" }} />
        <div className="w-hatch" style={{ width: `${seg(aaa)}%` }} />
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 8,
          fontFamily: "var(--w-mono)",
          fontSize: 11,
          color: "var(--w-fg-muted)",
        }}
      >
        <Legend dot="var(--w-fg)" label="GA" n={ga} t={gaTotal} />
        <Legend dot="var(--w-acc)" label="VIP" n={vip} t={vipTotal} />
        <Legend dot="hatch" label="AAA" n={aaa} t={aaaTotal} />
      </div>
    </div>
  );
}

interface LegendProps {
  dot: string;
  label: string;
  n: number;
  t: number;
}

function Legend({ dot, label, n, t }: LegendProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {dot === "hatch" ? (
        <span
          className="w-hatch"
          style={{ width: 10, height: 10, borderRadius: 2 }}
        />
      ) : (
        <span
          style={{ width: 10, height: 10, borderRadius: 2, background: dot }}
        />
      )}
      <span style={{ color: "var(--w-fg)" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {n}/{t}
      </span>
    </span>
  );
}
