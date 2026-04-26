"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Inline icon set — Lucide-style without the dep. 16x16 default.
function Icon({ d, className, strokeWidth = 1.75 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_PATHS = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  user: "M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  scroll: "M19 17V5a2 2 0 0 0-2-2H4 M15 8H9 M15 12H9 M15 16h-3 M19 17a2 2 0 0 0 2 2H7a2 2 0 0 0-2-2v-2",
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

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);

  // Global Cmd+K / Ctrl+K toggle.
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

  // Focus input when opened, clear when closed.
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  // Debounced search.
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
          { cache: "no-store" }
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

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits[activeIdx]) {
      e.preventDefault();
      go(hits[activeIdx].href);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-line text-muted hover:text-cream hover:border-cream/30 transition text-xs"
      >
        <span className="font-sans">Search</span>
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-s2 border border-line">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl bg-s1 border border-line rounded-lg shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
        <div className="flex items-center px-4 py-3 border-b border-line">
          <Icon d={ICON_PATHS.search} className="w-4 h-4 text-coral mr-3" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search events, guests, holders…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 bg-transparent border-0 outline-none text-cream font-sans text-base placeholder:text-muted"
          />
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-s2 border border-line text-muted">
            esc
          </kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="label-mono px-4 py-3 text-muted">Searching…</p>
          )}
          {!loading && q.trim().length >= 2 && hits.length === 0 && (
            <p className="label-mono px-4 py-3 text-muted">No matches.</p>
          )}
          {!loading && q.trim().length < 2 && (
            <p className="label-mono px-4 py-3 text-muted">
              Type 2+ chars. ↑↓ navigate, ↵ open.
            </p>
          )}
          <ul>
            {hits.map((h, i) => (
              <li key={`${h.kind}-${h.href}-${i}`}>
                <button
                  type="button"
                  onClick={() => go(h.href)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-2 ${
                    i === activeIdx
                      ? "border-coral bg-s2"
                      : "border-transparent hover:bg-s2"
                  }`}
                >
                  <Icon
                    d={KIND_ICON_PATH[h.kind]}
                    className={`w-4 h-4 shrink-0 ${
                      h.kind === "nav" ? "text-coral" : "text-muted"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-cream truncate">{h.title}</p>
                    {h.subtitle && (
                      <p className="label-mono mt-0.5 truncate">
                        {h.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="label-mono shrink-0 text-muted">
                    {KIND_LABEL[h.kind]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
