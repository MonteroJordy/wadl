"use client";

import * as React from "react";

interface Props {
  /** Primary save action (usually a Button or FormSubmit). */
  primary: React.ReactNode;
  /** Optional secondary action (Cancel, Discard, etc.). Rendered left. */
  secondary?: React.ReactNode;
  /** Optional status content (SaveIndicator, dirty-state hint, error). */
  status?: React.ReactNode;
  /** Show only after the user scrolls past this many pixels. Default 200. */
  appearAfterPx?: number;
  /** Force visible regardless of scroll position. Useful while pending. */
  alwaysVisible?: boolean;
}

/**
 * Sticky footer that pins primary form actions to the bottom of the
 * viewport so users on long forms never lose the save button. Animates
 * in/out based on scroll position so it doesn't clutter the layout on
 * short forms.
 *
 * Place at the end of the form (still inside the <form> tag — submit
 * buttons inherit the enclosing form). Respects mobile bottom tab bar
 * via env(safe-area-inset-bottom).
 */
export default function StickyFormFooter({
  primary,
  secondary,
  status,
  appearAfterPx = 200,
  alwaysVisible = false,
}: Props) {
  const [visible, setVisible] = React.useState(alwaysVisible);

  React.useEffect(() => {
    if (alwaysVisible) {
      setVisible(true);
      return;
    }
    function onScroll() {
      setVisible(window.scrollY > appearAfterPx);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [appearAfterPx, alwaysVisible]);

  return (
    <>
      {/* Spacer so the form's natural footer doesn't get hidden behind
          our sticky bar when both are visible at the bottom of scroll. */}
      <div aria-hidden="true" style={{ height: visible ? 64 : 0 }} />
      <div
        role="region"
        aria-label="Form actions"
        className="w-sticky-footer"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 22,
          background: "rgba(15, 15, 16, 0.92)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid var(--w-line)",
          padding:
            "10px 24px calc(10px + env(safe-area-inset-bottom)) 24px",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition:
            "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms",
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            {secondary}
            {status}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {primary}
          </div>
        </div>
      </div>
    </>
  );
}
