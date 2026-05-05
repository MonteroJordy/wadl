"use client";

import * as React from "react";
import { Chip } from "./chip";

export type Tier = "GA" | "VIP" | "AAA";

interface CredPillProps {
  tier?: Tier;
  style?: React.CSSProperties;
}

export function CredPill({ tier = "GA", style = {} }: CredPillProps) {
  if (tier === "VIP") {
    return (
      <Chip tone="acc" style={style}>
        <span style={{ fontSize: 9 }}>✦</span>
        VIP
      </Chip>
    );
  }
  if (tier === "AAA") {
    return (
      <span
        className="w-chip"
        style={{
          background: "transparent",
          color: "var(--w-fg)",
          boxShadow: "inset 0 0 0 1px var(--w-fg)",
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--w-fg) 0 1px, transparent 1px 5px)",
          ...style,
        }}
      >
        <span style={{ fontSize: 9 }}>◆</span>
        AAA
      </span>
    );
  }
  return (
    <Chip tone="neutral" style={style}>
      GA
    </Chip>
  );
}

// Decorative QR — deterministic from a seed string. For real check-in QR,
// pass a node via the `qrSlot` prop on CredentialCard.
interface QRBlockProps {
  size?: number;
  seed?: string;
  dark?: string;
  light?: string;
}

export function QRBlock({
  size = 96,
  seed = "WADL",
  dark = "#0a0a0b",
  light = "#f3f1ec",
}: QRBlockProps) {
  const N = 21;
  const cells = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const out: boolean[] = [];
    for (let i = 0; i < N * N; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      h >>>= 0;
      out.push((h & 1) === 1);
    }
    const setFinder = (cx: number, cy: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const onRing = x === 0 || x === 6 || y === 0 || y === 6;
          const onInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          out[(cy + y) * N + (cx + x)] = onRing || onInner;
        }
      }
    };
    setFinder(0, 0);
    setFinder(14, 0);
    setFinder(0, 14);
    return out;
  }, [seed]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${N} ${N}`}
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      <rect width={N} height={N} fill={light} />
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % N}
            y={Math.floor(i / N)}
            width={1}
            height={1}
            fill={dark}
          />
        ) : null,
      )}
    </svg>
  );
}

function PerfRule() {
  return (
    <div style={{ position: "relative", height: 14 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 6,
          borderTop: "1px dashed var(--w-line-2)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -7,
          top: 0,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--w-bg)",
          boxShadow: "inset 0 0 0 1px var(--w-line)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -7,
          top: 0,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "var(--w-bg)",
          boxShadow: "inset 0 0 0 1px var(--w-line)",
        }}
      />
    </div>
  );
}

type CredVariant = "mono" | "stub" | "holo";

interface CredentialCardProps {
  tier?: Tier;
  name?: string;
  event?: string;
  date?: string;
  list?: string;
  code?: string;
  variant?: CredVariant;
  qrSlot?: React.ReactNode;
}

export function CredentialCard({
  tier = "GA",
  name = "Maya Chen",
  event = "Boiler Room · Brooklyn",
  date = "SAT 03 MAY",
  list = "Diplo's List",
  code = "WAD-7K2-LIME",
  variant = "mono",
  qrSlot,
}: CredentialCardProps) {
  const qr = qrSlot ?? <QRBlock size={92} seed={code} />;

  if (variant === "holo") {
    return (
      <div
        style={{
          borderRadius: "var(--w-r-md)",
          overflow: "hidden",
          border: "1px solid var(--w-line)",
        }}
      >
        <div className="w-holo" style={{ padding: 18, color: "#0a0a0b" }}>
          <div
            className="w-type-meta"
            style={{ color: "#0a0a0b", opacity: 0.8 }}
          >
            WADL CREDENTIAL · {tier}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginTop: 4,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              fontFamily: "var(--w-mono)",
            }}
          >
            {date} · {event}
          </div>
        </div>
        <div
          style={{
            background: "var(--w-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          {qrSlot ?? <QRBlock size={104} seed={code} />}
        </div>
      </div>
    );
  }

  if (variant === "stub") {
    return (
      <div
        style={{
          borderRadius: "var(--w-r-md)",
          overflow: "hidden",
          border: "1px solid var(--w-line)",
          background: "var(--w-surface-2)",
        }}
      >
        <div
          style={{
            padding: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div className="w-type-meta">{event}</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                marginTop: 6,
              }}
            >
              {name}
            </div>
            <div
              className="w-type-meta"
              style={{ marginTop: 6, color: "var(--w-fg-muted)" }}
            >
              {list}
            </div>
          </div>
          <CredPill tier={tier} />
        </div>
        <PerfRule />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
          }}
        >
          {qrSlot ?? <QRBlock size={84} seed={code} />}
          <div>
            <div className="w-type-meta">CODE</div>
            <div
              style={{
                fontFamily: "var(--w-mono)",
                fontSize: 14,
                marginTop: 2,
              }}
            >
              {code}
            </div>
            <div className="w-type-meta" style={{ marginTop: 8 }}>
              DOORS
            </div>
            <div
              style={{
                fontFamily: "var(--w-mono)",
                fontSize: 14,
                marginTop: 2,
              }}
            >
              {date} · 22:00
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mono — type-only, dice-leaning
  return (
    <div
      style={{
        borderRadius: "var(--w-r-md)",
        overflow: "hidden",
        border: "1px solid var(--w-line)",
        background: "#0a0a0b",
      }}
    >
      <div style={{ padding: "20px 18px 14px" }}>
        <div className="w-type-meta">CREDENTIAL · {tier}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginTop: 6,
          }}
        >
          {name}
        </div>
        <div
          className="w-type-meta"
          style={{ color: "var(--w-fg-muted)", marginTop: 4 }}
        >
          {event}
        </div>
      </div>
      <div
        style={{
          borderTop: "1px dashed var(--w-line-2)",
          display: "flex",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="w-type-meta">DOORS</div>
            <div
              style={{
                fontFamily: "var(--w-mono)",
                fontSize: 14,
                marginTop: 2,
              }}
            >
              {date}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="w-type-meta">LIST</div>
            <div
              style={{
                fontFamily: "var(--w-mono)",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {list}
            </div>
          </div>
        </div>
        <div
          style={{
            borderLeft: "1px dashed var(--w-line-2)",
            padding: 14,
            background: "var(--w-fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {qr}
        </div>
      </div>
    </div>
  );
}
