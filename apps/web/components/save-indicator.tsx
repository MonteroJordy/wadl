"use client";

import * as React from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  state: SaveState;
  /** Optional override for the visible label, per state. */
  labels?: Partial<Record<SaveState, string>>;
  /** Optional error message — shown on hover/focus when state="error". */
  errorMessage?: string;
  /** Auto-hide the "saved" pill after this many ms. Default 2000. */
  savedAutoHideMs?: number;
  /** Called when "saved" auto-hides. Use to flip state back to "idle". */
  onAutoHide?: () => void;
}

const DEFAULT_LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

const TONE: Record<SaveState, { color: string; bg: string }> = {
  idle: { color: "var(--w-fg-dim)", bg: "transparent" },
  saving: { color: "var(--w-fg-muted)", bg: "transparent" },
  saved: { color: "var(--w-ok)", bg: "transparent" },
  error: { color: "var(--w-err)", bg: "transparent" },
};

/**
 * Tiny status pill that lives next to a form field or section header.
 * Communicates the save lifecycle without flashing toasts. The "saved"
 * state auto-hides after a short delay; the parent owns the state and
 * resets to "idle" via onAutoHide.
 *
 * Usage:
 *   const [saveState, setSaveState] = useState<SaveState>("idle");
 *   <SaveIndicator state={saveState} onAutoHide={() => setSaveState("idle")} />
 *
 *   async function save() {
 *     setSaveState("saving");
 *     try {
 *       await ...
 *       setSaveState("saved");
 *     } catch (e) {
 *       setSaveState("error");
 *     }
 *   }
 */
export default function SaveIndicator({
  state,
  labels,
  errorMessage,
  savedAutoHideMs = 2000,
  onAutoHide,
}: Props) {
  React.useEffect(() => {
    if (state !== "saved" || !onAutoHide) return;
    const t = setTimeout(onAutoHide, savedAutoHideMs);
    return () => clearTimeout(t);
  }, [state, savedAutoHideMs, onAutoHide]);

  if (state === "idle") return null;

  const label =
    labels?.[state] ?? DEFAULT_LABELS[state];
  const tone = TONE[state];
  const title = state === "error" ? errorMessage ?? label : undefined;

  return (
    <>
      {state === "saving" && (
        <style>{`@keyframes wadlSaveSpin { to { transform: rotate(360deg) } }`}</style>
      )}
      <span
        role={state === "error" ? "alert" : "status"}
        aria-live="polite"
        title={title}
        className="w-type-meta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: tone.color,
          background: tone.bg,
          padding: "2px 6px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {state === "saving" && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              border: "1.5px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "wadlSaveSpin 0.8s linear infinite",
            }}
          />
        )}
        {state === "saved" && (
          <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>
            ✓
          </span>
        )}
        {state === "error" && (
          <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>
            ⚠
          </span>
        )}
        {label}
      </span>
    </>
  );
}
