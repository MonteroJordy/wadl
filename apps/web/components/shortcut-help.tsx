"use client";

import { useEffect, useState } from "react";

/** Dispatch this anywhere to programmatically open the overlay. Useful
 * for sidebar / toolbar "Help" buttons that should open the same UI
 * without requiring users to know the `?` shortcut. */
export const SHORTCUT_HELP_OPEN_EVENT = "wadl:shortcut-help:open";
export function openShortcutHelp(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHORTCUT_HELP_OPEN_EVENT));
}

/**
 * Press `?` (or Shift+/) anywhere in the app to surface a cheat sheet
 * of keyboard shortcuts. ESC closes. Skipped when focus is in an input
 * so users typing literal question marks don't trigger it.
 *
 * Mounted once globally inside the owner layout. Each shortcut here
 * must actually be wired somewhere in the app — keep this list and the
 * real keydown handlers in sync. New shortcut → add a row.
 */
const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
  { keys: ["⌘", "K"], description: "Open search" },
  { keys: ["⌘", "S"], description: "Save the current form" },
  { keys: ["?"], description: "Show this cheat sheet" },
  { keys: ["esc"], description: "Close any dialog, drawer, or modal" },
];

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ESC always closes.
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      // Don't hijack `?` while the user is typing into an input/textarea
      // or any contentEditable surface.
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          t.isContentEditable
        ) {
          return;
        }
      }
      // Modifier keys → no shortcut. ⌘K is owned by the command palette.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // `?` is Shift+/ on US layouts; e.key is "?" directly.
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(SHORTCUT_HELP_OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(SHORTCUT_HELP_OPEN_EVENT, onOpenEvent);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(8, 8, 10, 0.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="w-card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 24,
          background: "var(--w-surface-2)",
          border: "1px solid var(--w-line-2)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            id="shortcut-help-title"
            className="w-type-display-sm"
            style={{ margin: 0 }}
          >
            Shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--w-fg-muted)",
              cursor: "pointer",
              fontFamily: "var(--w-mono)",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {SHORTCUTS.map((row) => (
            <li
              key={row.description}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <span
                style={{
                  color: "var(--w-fg)",
                  fontSize: 14,
                }}
              >
                {row.description}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {row.keys.map((k, i) => (
                  <kbd
                    key={`${row.description}-${i}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 24,
                      height: 24,
                      padding: "0 6px",
                      background: "var(--w-surface-1)",
                      border: "1px solid var(--w-line)",
                      color: "var(--w-fg)",
                      fontFamily: "var(--w-mono)",
                      fontSize: 11,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p
          className="w-type-meta"
          style={{
            marginTop: 20,
            color: "var(--w-fg-dim)",
            textAlign: "center",
          }}
        >
          PRESS ? ANYTIME TO REOPEN
        </p>
      </div>
    </div>
  );
}
