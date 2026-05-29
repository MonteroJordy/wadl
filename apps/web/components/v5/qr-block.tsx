import * as React from "react";

/**
 * Decorative deterministic QR for setup / preview surfaces (e.g. the 2FA
 * setup page). For real check-in QRs, render the actual code.
 */
interface QRBlockProps {
  size?: number;
  seed?: string;
  dark?: string;
  light?: string;
}

export function QRBlock({
  size = 96,
  seed = "WADL",
  dark = "#0a0a0a",
  light = "#ffffff",
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
