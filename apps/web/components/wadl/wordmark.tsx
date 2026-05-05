import * as React from "react";

type Variant = "monogrid" | "block" | "slash" | "door";

interface WordmarkProps {
  variant?: Variant;
  size?: number;
  color?: string;
  accent?: string;
}

export function Wordmark({
  variant = "monogrid",
  size = 28,
  color = "var(--w-fg)",
  accent = "var(--w-acc)",
}: WordmarkProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--w-display)",
    color,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 700,
    fontSize: size,
  };

  if (variant === "monogrid") {
    return (
      <span
        style={{
          ...baseStyle,
          display: "inline-flex",
          alignItems: "center",
          gap: size * 0.06,
        }}
      >
        <span>WADL</span>
        <span
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: accent,
            borderRadius: 2,
            marginLeft: size * 0.12,
            marginBottom: size * 0.08,
          }}
        />
      </span>
    );
  }

  if (variant === "block") {
    return (
      <span
        style={{
          ...baseStyle,
          display: "inline-flex",
          alignItems: "baseline",
          fontWeight: 800,
          letterSpacing: "-0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>WA</span>
        <span
          style={{
            background: accent,
            color: "var(--w-acc-ink)",
            padding: `${size * 0.08}px ${size * 0.12}px`,
            borderRadius: 4,
            marginInline: size * 0.04,
          }}
        >
          DL
        </span>
      </span>
    );
  }

  if (variant === "slash") {
    return (
      <span
        style={{
          ...baseStyle,
          display: "inline-flex",
          alignItems: "center",
          gap: size * 0.18,
          fontFamily: "var(--w-mono)",
          letterSpacing: "0.02em",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: accent }}>▍</span>
        <span>wadl</span>
      </span>
    );
  }

  // door
  return (
    <svg
      viewBox="0 0 200 64"
      width={size * 3.2}
      height={size}
      style={{ display: "block" }}
    >
      <text
        x="0"
        y="50"
        fontFamily="var(--w-display)"
        fontSize="60"
        fontWeight="700"
        letterSpacing="-3"
        fill={color}
      >
        WAD
      </text>
      <text
        x="135"
        y="50"
        fontFamily="var(--w-display)"
        fontSize="60"
        fontWeight="700"
        letterSpacing="-3"
        fill={accent}
      >
        L
      </text>
      <rect x="135" y="9" width="55" height="2" fill={accent} />
    </svg>
  );
}
