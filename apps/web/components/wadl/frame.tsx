import * as React from "react";

/**
 * Mobile frame for repainted screens. Drop-in replacement for `.mobile-frame`
 * on screens that have moved to the new design system. The body painter
 * (in globals.css) detects `.w-frame` and switches to the near-black canvas.
 */
interface WFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function WFrame({ className = "", children, ...rest }: WFrameProps) {
  return (
    <div
      className={["w-app w-frame", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Section header used for grouped lists (Settings-style).
 */
interface SectionLabelProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionLabel({ children, action }: SectionLabelProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "20px 20px 8px",
      }}
    >
      <span className="w-type-meta">{children}</span>
      {action}
    </div>
  );
}

/**
 * Cover image placeholder — striped, 4:5 by default. Used while the real
 * flyer image is loading or absent.
 */
interface CoverPlaceholderProps {
  ratio?: string;
  label?: string;
  style?: React.CSSProperties;
}

export function CoverPlaceholder({
  ratio = "4 / 5",
  label = "COVER · 4:5",
  style = {},
}: CoverPlaceholderProps) {
  return (
    <div
      style={{
        aspectRatio: ratio,
        background:
          "repeating-linear-gradient(135deg, #1a1a1c 0 8px, #131315 8px 16px)",
        borderRadius: "var(--w-r-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--w-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        color: "var(--w-fg-dim)",
        textTransform: "uppercase",
        border: "1px solid var(--w-line)",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

/**
 * Perforated rule — mimics a tear-stub edge. Used inside CredentialCard
 * variants but exported in case a screen wants to reuse it.
 */
export function PerfRule() {
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
