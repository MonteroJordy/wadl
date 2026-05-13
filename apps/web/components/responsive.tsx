/**
 * Responsive layout primitives that genuinely differentiate desktop from
 * mobile — not just sizing but structure.
 *
 * `<DesktopOnly>` / `<MobileOnly>` use CSS display:none at the 768px
 * breakpoint so server components ship structurally different markup for
 * each viewport. No JS check, no hydration mismatch — both render but only
 * one shows.
 *
 * `<PageFrame>` reads the responsive page-pad tokens from globals.css.
 *
 * `width` on PageFrame:
 *   "narrow"  → 720px max (forms, single guest detail, settings)
 *   "medium"  → 960px max (recap, lists with detail)
 *   "wide"    → 1200px max (daydash, owner home, analytics overview)
 *   "xwide"   → 1440px max (multi-column dashboards)
 */

import type { CSSProperties, ReactNode } from "react";

const W: Record<string, string> = {
  narrow: "var(--w-content-narrow)",
  medium: "var(--w-content-medium)",
  wide: "var(--w-content-wide)",
  xwide: "var(--w-content-xwide)",
};

export function PageFrame({
  children,
  width = "wide",
  style,
}: {
  children: ReactNode;
  width?: "narrow" | "medium" | "wide" | "xwide";
  style?: CSSProperties;
}) {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        paddingTop: "var(--w-page-pad-y)",
        paddingBottom: "var(--w-page-pad-bottom)",
        paddingLeft: "var(--w-page-pad-x)",
        paddingRight: "var(--w-page-pad-x)",
        ...style,
      }}
    >
      <div style={{ maxWidth: W[width], margin: "0 auto" }}>{children}</div>
    </main>
  );
}

export function DesktopOnly({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .w-desktop-only { display: none !important; }
        }
      `}</style>
      <div className="w-desktop-only" style={{ display: "contents" }}>
        {children}
      </div>
    </>
  );
}

export function MobileOnly({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .w-mobile-only { display: none !important; }
        }
      `}</style>
      <div className="w-mobile-only" style={{ display: "contents" }}>
        {children}
      </div>
    </>
  );
}

/**
 * Two-column desktop layout, single-column mobile.
 * `aside` becomes a sticky right rail on desktop.
 */
export function SplitView({
  main,
  aside,
  asideWidth = 360,
  gap = 24,
}: {
  main: ReactNode;
  aside: ReactNode;
  asideWidth?: number;
  gap?: number;
}) {
  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .w-splitview {
            display: grid !important;
            grid-template-columns: 1fr ${asideWidth}px !important;
            gap: ${gap}px !important;
            align-items: start !important;
          }
          .w-splitview-aside {
            position: sticky !important;
            top: 16px !important;
          }
        }
      `}</style>
      <div className="w-splitview" style={{ display: "block" }}>
        <div>{main}</div>
        <div className="w-splitview-aside" style={{ marginTop: 16 }}>
          {aside}
        </div>
      </div>
    </>
  );
}
