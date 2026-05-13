"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function Icon({
  d,
  size = 16,
  strokeWidth = 1.75,
  color,
}: {
  d: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, color }}
    >
      <path d={d} />
    </svg>
  );
}

const ICON_PATHS = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35",
  calendar:
    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  user: "M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  scroll:
    "M19 17V5a2 2 0 0 0-2-2H4 M15 8H9 M15 12H9 M15 16h-3 M19 17a2 2 0 0 0 2 2H7a2 2 0 0 0-2-2v-2",
  arrow: "M5 12h14 M12 5l7 7-7 7",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

interface Hit {
  kind: "event" | "guest" | "allocation" | "audit" | "nav" | "sms";
  href: string;
  title: string;
  subtitle?: string;
}

const KIND_LABEL: Record<Hit["kind"], string> = {
  event: "Event",
  guest: "Guest",
  allocation: "Holder",
  audit: "Audit",
  nav: "Go",
  sms: "SMS",
};

const KIND_ICON_PATH: Record<Hit["kind"], string> = {
  event: ICON_PATHS.calendar,
  guest: ICON_PATHS.user,
  allocation: ICON_PATHS.users,
  audit: ICON_PATHS.scroll,
  nav: ICON_PATHS.arrow,
  sms: ICON_PATHS.message,
};

const KBD: React.CSSProperties = {
  fontFamily: "var(--w-mono)",
  fontSize: 10,
  padding: "2px 6px",
  background: "var(--w-surface-2)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg-muted)",
};

/**
 * Quick destinations shown when the palette is open but no query has
 * been typed yet. Each one is a Hit shape so it renders through the
 * same row component as search results — no extra UI to maintain.
 */
const QUICK_HITS: Hit[] = [
  { kind: "nav", href: "/owner/events/new", title: "New event", subtitle: "Book a night" },
  { kind: "nav", href: "/owner", title: "This week", subtitle: "Dashboard" },
  { kind: "nav", href: "/owner/calendar", title: "Calendar", subtitle: "Month view" },
  { kind: "nav", href: "/owner/holders", title: "Promoters", subtitle: "Everyone who's repped a list" },
  { kind: "nav", href: "/owner/analytics", title: "Analytics", subtitle: "Show rate, capacity, scores" },
  { kind: "nav", href: "/owner/profile", title: "Profile + venues", subtitle: "Account settings" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const id = ++reqIdRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const j = (await res.json()) as { ok: boolean; hits?: Hit[] };
        if (id !== reqIdRef.current) return;
        setHits(j.hits ?? []);
        setActiveIdx(0);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  // The list rendered on screen — search results when the user is
  // searching, otherwise the QUICK_HITS shortcut list. Arrow keys +
  // Enter both index into this single source so navigation works in
  // either state.
  const visibleHits: Hit[] =
    q.trim().length < 2 && !loading ? QUICK_HITS : hits;

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) =>
        Math.min(i + 1, Math.max(0, visibleHits.length - 1)),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && visibleHits[activeIdx]) {
      e.preventDefault();
      go(visibleHits[activeIdx].href);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        title="Search events, guests, holders (⌘K)"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 12px",
          border: "1px solid var(--w-line)",
          background: "var(--w-surface-2)",
          color: "var(--w-fg-muted)",
          fontSize: 13,
          cursor: "pointer",
          minWidth: 180,
          transition: "background 0.12s, border-color 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--w-surface-3)";
          e.currentTarget.style.borderColor = "var(--w-line-2)";
          e.currentTarget.style.color = "var(--w-fg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--w-surface-2)";
          e.currentTarget.style.borderColor = "var(--w-line)";
          e.currentTarget.style.color = "var(--w-fg-muted)";
        }}
      >
        <Icon d={ICON_PATHS.search} size={14} />
        <span style={{ fontFamily: "var(--w-sans)", flex: 1, textAlign: "left" }}>
          Search…
        </span>
        <kbd style={KBD}>⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        padding: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 580,
          background: "var(--w-surface-1)",
          border: "1px solid var(--w-line)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--w-line)",
          }}
        >
          <Icon
            d={ICON_PATHS.search}
            color="var(--w-acc)"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search events, guests, holders…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              color: "var(--w-fg)",
              fontFamily: "var(--w-sans)",
              fontSize: 16,
              marginLeft: 12,
            }}
          />
          <kbd style={KBD}>esc</kbd>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {loading && (
            <div
              className="w-type-meta"
              style={{
                padding: "12px 16px",
                color: "var(--w-fg-muted)",
              }}
            >
              SEARCHING…
            </div>
          )}
          {!loading && q.trim().length >= 2 && hits.length === 0 && (
            <div
              className="w-type-meta"
              style={{
                padding: "12px 16px",
                color: "var(--w-fg-muted)",
              }}
            >
              NO MATCHES.
            </div>
          )}
          {!loading && q.trim().length < 2 && (
            <div
              className="w-type-meta"
              style={{
                padding: "12px 16px 8px",
                color: "var(--w-fg-dim)",
              }}
            >
              QUICK ACTIONS
            </div>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visibleHits.map((h, i) => {
              const active = i === activeIdx;
              return (
                <li key={`${h.kind}-${h.href}-${i}`}>
                  <button
                    type="button"
                    onClick={() => go(h.href)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      textAlign: "left",
                      borderLeft: `2px solid ${active ? "var(--w-acc)" : "transparent"}`,
                      background: active
                        ? "var(--w-surface-2)"
                        : "transparent",
                      cursor: "pointer",
                      border: "none",
                      borderLeftStyle: "solid",
                      borderLeftWidth: 2,
                      borderLeftColor: active
                        ? "var(--w-acc)"
                        : "transparent",
                      color: "inherit",
                    }}
                  >
                    <Icon
                      d={KIND_ICON_PATH[h.kind]}
                      color={
                        h.kind === "nav"
                          ? "var(--w-acc)"
                          : "var(--w-fg-muted)"
                      }
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          color: "var(--w-fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {h.title}
                      </p>
                      {h.subtitle && (
                        <div
                          className="w-type-meta"
                          style={{
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {h.subtitle}
                        </div>
                      )}
                    </div>
                    <span
                      className="w-type-meta"
                      style={{
                        flexShrink: 0,
                        color: "var(--w-fg-muted)",
                      }}
                    >
                      {KIND_LABEL[h.kind].toUpperCase()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
