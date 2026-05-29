"use client";

import * as React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to copy when the button is clicked. */
  text: string;
  /** Optional alternate label. Defaults to "Copy" / "Copied". */
  idleLabel?: string;
  copiedLabel?: string;
  /** Brief visual style. "outline" matches the v3 ghost-button look. */
  variant?: "outline" | "inline" | "icon";
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * One-click copy with proper success feedback. Switches its icon + label
 * for ~1.5s after a successful copy. Falls back gracefully if
 * `navigator.clipboard` is unavailable.
 *
 * Variants:
 *  - "outline" (default): pill-shaped button matching the ghost style
 *  - "inline": text-only, for use inside dense tables
 *  - "icon": just an icon, for use in input adornments
 */
export default function CopyButton({
  text,
  idleLabel = "Copy",
  copiedLabel = "Copied",
  variant = "outline",
  className = "",
  style,
  ...rest
}: Props) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Legacy fallback for non-secure-context dev environments.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Swallow — the icon stays in the "Copy" state which is honest.
    }
  }

  const label = copied ? copiedLabel : idleLabel;
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s, background 0.15s",
    color: copied ? "var(--w-ok)" : "var(--w-fg)",
    ...style,
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onCopy}
        aria-label={label}
        title={label}
        className={className}
        {...rest}
        style={{
          ...baseStyle,
          width: 32,
          height: 32,
          padding: 0,
          justifyContent: "center",
          background: "transparent",
          border: 0,
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onCopy}
        className={["w-type-meta", className].filter(Boolean).join(" ")}
        {...rest}
        style={{
          ...baseStyle,
          padding: 0,
          background: "transparent",
          border: 0,
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {label}
      </button>
    );
  }

  // "outline" default
  return (
    <button
      type="button"
      onClick={onCopy}
      className={className}
      {...rest}
      style={{
        ...baseStyle,
        height: 36,
        padding: "0 12px",
        background: "transparent",
        border: `1px solid ${copied ? "var(--w-ok)" : "var(--w-line-2)"}`,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label}
    </button>
  );
}
