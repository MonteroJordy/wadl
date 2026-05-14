/**
 * WADL v5 shared component library — ported verbatim from the Claude
 * Design handoff (wadl-v5-shared.jsx + wadl-v5-pages.jsx). These are the
 * structural primitives every v5 screen composes from. Pure presentational
 * components — server-component safe (no hooks, no "use client").
 *
 * The visual token classes (.t-display-*, .btn, .card, .chip, .row,
 * .nav-item, etc.) live in app/globals.css under the "WADL v5 component
 * library" block.
 */
import * as React from "react";

/* ─── seed → deterministic hue (matches the design's hash exactly) ─── */
function seedHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function coverBg(seed: string): string {
  const h = seedHue(seed);
  return (
    `radial-gradient(circle at 30% 40%, hsl(${h}, 8%, 26%) 0%, transparent 65%), ` +
    `radial-gradient(circle at 75% 70%, hsl(0, 0%, 16%) 0%, transparent 65%), #0a0a0a`
  );
}

/* ─── COVER — the event "image" (procedural gradient + legibility scrim) ─── */
export function Cover({
  seed = "Donato Dozzy",
  height = 280,
  children,
  style,
}: {
  seed?: string;
  height?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        background: coverBg(seed),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)",
        }}
      />
      {children}
    </div>
  );
}

/* ─── COVER HEADER — page-level hero with eyebrow + title + actions ─── */
export function CoverHeader({
  seed,
  eyebrow,
  title,
  actions,
  height = 340,
}: {
  seed: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
  height?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        background: coverBg(seed),
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.75) 70%, rgba(10,10,10,0.95) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "var(--s-8)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "var(--s-6)",
            flexWrap: "wrap",
          }}
        >
          <div>
            {eyebrow && (
              <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
                {eyebrow}
              </div>
            )}
            <div className="t-display-lg" style={{ lineHeight: 1.0 }}>
              {title}
            </div>
          </div>
          {actions && (
            <div style={{ display: "flex", gap: "var(--s-2)" }}>{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── STAT — consistent metric block (used in 4-up rows) ─── */
export function Stat({
  label,
  value,
  delta,
  sub,
  last,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  sub?: string;
  /** When true, drops the right divider (last cell in a row). */
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: "var(--s-6)",
        borderRight: last ? "none" : "1px solid var(--line)",
      }}
    >
      <div className="t-meta">{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--s-2)",
          marginTop: "var(--s-3)",
        }}
      >
        <span className="t-display-md t-num">{value}</span>
        {delta && (
          <span className="t-meta" style={{ color: "var(--ok)" }}>
            {delta}
          </span>
        )}
      </div>
      {sub && (
        <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── PAGE HEADER — when there's no cover hero ─── */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "var(--s-8) var(--s-8) var(--s-6)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {eyebrow && (
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          {eyebrow}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--s-6)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="t-display-md">{title}</div>
          {sub && (
            <div
              className="t-body-2"
              style={{ marginTop: "var(--s-2)", maxWidth: 560 }}
            >
              {sub}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", gap: "var(--s-2)" }}>{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ─── EVENT SUB-NAV — tab bar shared across event pages ─── */
export function EventSubNav({
  active = "overview",
  eventId,
}: {
  active?: string;
  /** When set, tabs render as links to /owner/events/[id]/<tab>. */
  eventId?: string;
}) {
  const tabs: Array<[string, string, string]> = [
    ["overview", "Overview", ""],
    ["guests", "Guests", "/waitlist"],
    ["lineup", "Lineup", "/template"],
    ["comms", "Comms", "/broadcast"],
    ["staff", "Staff", "/staff"],
    ["settings", "Settings", "/settings"],
  ];
  return (
    <div
      style={{
        borderBottom: "1px solid var(--line)",
        padding: "0 var(--s-8)",
        display: "flex",
        gap: "var(--s-1)",
        overflowX: "auto",
      }}
    >
      {tabs.map(([k, l, suffix]) => {
        const inner = (
          <div
            style={{
              padding: "var(--s-4)",
              color: k === active ? "var(--fg)" : "var(--fg-3)",
              fontSize: "var(--ts-md)",
              fontWeight: k === active ? 500 : 400,
              borderBottom:
                k === active
                  ? "2px solid var(--fg)"
                  : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              transition: "color .12s",
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </div>
        );
        if (eventId) {
          return (
            <a
              key={k}
              href={`/owner/events/${eventId}${suffix}`}
              style={{ textDecoration: "none" }}
            >
              {inner}
            </a>
          );
        }
        return <React.Fragment key={k}>{inner}</React.Fragment>;
      })}
    </div>
  );
}

/* ─── BREADCRUMB ─── */
export function Breadcrumb({
  items,
}: {
  /** [label, href?] — last item is the current page (no link). */
  items: Array<string | [string, string]>;
}) {
  return (
    <div
      style={{
        padding: "var(--s-4) var(--s-8) 0",
        display: "flex",
        alignItems: "center",
        gap: "var(--s-2)",
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const label = Array.isArray(item) ? item[0] : item;
        const href = Array.isArray(item) ? item[1] : undefined;
        const span = (
          <span
            style={{
              fontSize: "var(--ts-sm)",
              color: isLast ? "var(--fg)" : "var(--fg-3)",
              cursor: !isLast && href ? "pointer" : "default",
            }}
          >
            {label}
          </span>
        );
        return (
          <React.Fragment key={i}>
            {href && !isLast ? (
              <a href={href} style={{ textDecoration: "none" }}>
                {span}
              </a>
            ) : (
              span
            )}
            {!isLast && <span style={{ color: "var(--fg-4)" }}>/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── LOGO — angular asymmetric W with diagonal slash cut ─── */
export function Logo({
  size = 24,
  color = "var(--fg)",
  mark = false,
}: {
  size?: number;
  color?: string;
  mark?: boolean;
}) {
  return (
    <svg
      width={size * (mark ? 1 : 2.4)}
      height={size}
      viewBox={mark ? "0 0 24 24" : "0 0 58 24"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="WADL"
    >
      <path
        d="M 1 3 L 6 21 L 12 9 L 18 21 L 23 3 L 18 3 L 15.5 12 L 12 4 L 8.5 12 L 6 3 Z"
        fill={color}
      />
      <rect
        x="14"
        y="0"
        width="2.5"
        height="26"
        fill={color}
        transform="rotate(20 15 12)"
      />
      {!mark && (
        <text
          x="29"
          y="18"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="17"
          fill={color}
          letterSpacing="-0.04em"
        >
          WADL
        </text>
      )}
    </svg>
  );
}
