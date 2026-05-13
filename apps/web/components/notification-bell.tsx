"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtRelative } from "@wadl/shared/format";
import {
  KIND_LABEL,
  KIND_TONE,
  type NotificationKind,
} from "@/lib/notification-kinds";
import { markAllReadAction, markReadAction } from "@/app/owner/notifications/actions";

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

interface Row {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  unread: number;
  href?: string;
  /** Account ID to subscribe for realtime new-notification inserts. */
  accountId?: string;
}

const TONE_COLOR: Record<NonNullable<(typeof KIND_TONE)[NotificationKind]>, string> = {
  coral: "var(--w-err)",
  gold: "var(--w-warn)",
  mint: "var(--w-ok)",
};

/**
 * Bell that opens an inline dropdown panel with the last 10 notifications.
 * Click an item to mark-read + jump to its href. "Mark all read" /
 * "See all" footer. Realtime via Supabase channel — when a new notif
 * lands, the unread badge pings + the open panel auto-refetches.
 */
export default function NotificationBell({
  unread: initialUnread,
  href = "/owner/notifications",
  accountId,
}: Props) {
  const [unread, setUnread] = useState(initialUnread);
  const [pulsing, setPulsing] = useState(false);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/recent", {
        cache: "no-store",
      });
      const j = (await res.json()) as { ok: boolean; notifications?: Row[] };
      setRows(j.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime: ping the badge + refresh open panel on new insert.
  useEffect(() => {
    if (!accountId) return;
    const supabase = createClient();
    // Unique per-mount suffix prevents Supabase from de-duping the
    // channel with a leftover instance from StrictMode's double-mount,
    // which would otherwise throw "cannot add postgres_changes
    // callbacks ... after subscribe()".
    const channel = supabase
      .channel(`notif-bell:${accountId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          setUnread((c) => c + 1);
          setPulsing(true);
          setTimeout(() => setPulsing(false), 2000);
          if (open) void fetchRecent();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, open, fetchRecent]);

  // ESC closes; outside-click closes; first-open triggers a fetch.
  useEffect(() => {
    if (!open) return;
    void fetchRecent();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, fetchRecent]);

  async function onItemClick(row: Row) {
    if (!row.read_at) {
      // Optimistic: mark locally + decrement badge.
      setRows((cur) =>
        cur?.map((r) =>
          r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r,
        ) ?? null,
      );
      setUnread((c) => Math.max(0, c - 1));
      void markReadAction(row.id);
    }
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const href = typeof payload.href === "string" ? payload.href : null;
    if (href) {
      setOpen(false);
      // Defer to allow state to flush before navigating.
      setTimeout(() => {
        window.location.href = href;
      }, 0);
    }
  }

  async function onMarkAll() {
    setRows((cur) =>
      cur?.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })) ??
        null,
    );
    setUnread(0);
    await markAllReadAction();
  }

  return (
    <>
      <style>{`@keyframes wadlBellPing { 0% { box-shadow: 0 0 0 0 var(--w-acc); opacity: 0.7 } 100% { box-shadow: 0 0 0 12px transparent; opacity: 0 } }`}</style>
      <div ref={rootRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            border: `1px solid ${pulsing ? "var(--w-acc)" : "var(--w-line)"}`,
            background: "transparent",
            color: "var(--w-fg)",
            cursor: "pointer",
          }}
        >
          <BellIcon />
          {unread > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                padding: "0 4px",
                background: "var(--w-acc)",
                color: "var(--w-acc-ink)",
                fontSize: 10,
                fontFamily: "var(--w-mono)",
                fontWeight: 600,
                animation: pulsing ? "wadlBellPing 1.4s ease-out" : undefined,
              }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Recent notifications"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 380,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "var(--w-surface-2)",
              border: "1px solid var(--w-line-2)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
              zIndex: 60,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--w-line)",
              }}
            >
              <span className="w-type-meta">NOTIFICATIONS</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={onMarkAll}
                  className="w-type-meta"
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--w-acc)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  MARK ALL READ
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
              }}
            >
              {loading && rows === null ? (
                <ul
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                  aria-busy="true"
                  aria-label="Loading notifications"
                >
                  <style>{`@keyframes wadlNotifShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--w-line)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: "var(--w-line-2)",
                          }}
                        />
                        <span
                          style={{
                            height: 10,
                            width: "30%",
                            backgroundImage:
                              "linear-gradient(90deg, var(--w-surface-2), var(--w-surface-3), var(--w-surface-2))",
                            backgroundSize: "200% 100%",
                            animation:
                              "wadlNotifShimmer 1.4s ease-in-out infinite",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          height: 12,
                          width: `${70 - i * 10}%`,
                          backgroundImage:
                            "linear-gradient(90deg, var(--w-surface-2), var(--w-surface-3), var(--w-surface-2))",
                          backgroundSize: "200% 100%",
                          animation:
                            "wadlNotifShimmer 1.4s ease-in-out infinite",
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : rows && rows.length === 0 ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    className="w-type-meta"
                    style={{ color: "var(--w-ok)", marginBottom: 4 }}
                  >
                    ALL CLEAR
                  </div>
                  <p
                    className="w-type-body-sm"
                    style={{
                      color: "var(--w-fg-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    Nothing to triage. New activity will land here in
                    realtime.
                  </p>
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {(rows ?? []).map((row) => {
                    const kind = row.kind as NotificationKind;
                    const label = KIND_LABEL[kind] ?? row.kind;
                    const tone = KIND_TONE[kind] ?? "mint";
                    const payload = (row.payload ?? {}) as Record<string, unknown>;
                    const message =
                      typeof payload.message === "string" ? payload.message : null;
                    const eventName =
                      typeof payload.event_name === "string"
                        ? payload.event_name
                        : null;
                    const ago = fmtRelative(row.created_at) ?? "";
                    return (
                      <li
                        key={row.id}
                        style={{
                          borderBottom: "1px solid var(--w-line)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void onItemClick(row)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: row.read_at
                              ? "transparent"
                              : "rgba(245,255,55,0.04)",
                            border: 0,
                            padding: "12px 16px",
                            cursor: "pointer",
                            color: "inherit",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: TONE_COLOR[tone],
                                flexShrink: 0,
                                opacity: row.read_at ? 0.4 : 1,
                              }}
                            />
                            <span
                              className="w-type-meta"
                              style={{
                                color: row.read_at
                                  ? "var(--w-fg-dim)"
                                  : "var(--w-fg)",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {label.toUpperCase()}
                            </span>
                            <span
                              className="w-type-meta"
                              style={{
                                color: "var(--w-fg-dim)",
                                flexShrink: 0,
                              }}
                            >
                              {ago}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              lineHeight: 1.45,
                              color: row.read_at
                                ? "var(--w-fg-muted)"
                                : "var(--w-fg)",
                            }}
                          >
                            {message ?? eventName ?? "Open to view"}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--w-line)",
                padding: "10px 16px",
                textAlign: "center",
              }}
            >
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="w-type-meta"
                style={{
                  color: "var(--w-acc)",
                  textDecoration: "none",
                }}
              >
                SEE ALL →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
