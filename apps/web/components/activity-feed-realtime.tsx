"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ActivityFeed from "./activity-feed";

interface FeedRow {
  id: string;
  action: string;
  context: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
  event?: { name: string } | null;
  guest?: { full_name: string } | null;
}

/**
 * Day 46 — client wrapper around the server-rendered ActivityFeed.
 * Subscribes to audit_log INSERTs scoped to this event_id, prepends
 * new entries to the rendered list, and highlights them for ~2s so
 * the operator can see action landing live during a busy door.
 *
 * Falls back gracefully when eventId is omitted (no subscription, just
 * server-side rows).
 */
export default function ActivityFeedRealtime({
  initialRows,
  eventId,
  showEvent,
  emptyTitle,
  emptyBody,
}: {
  initialRows: FeedRow[];
  eventId?: string;
  showEvent?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [rows, setRows] = useState<FeedRow[]>(initialRows);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());

  // Sync if parent re-renders with new server-side data.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();
    // Unique per-mount suffix prevents Supabase from de-duping the
    // channel with a leftover instance from StrictMode's double-mount
    // (or a previous navigation), which would otherwise throw
    // "cannot add postgres_changes callbacks ... after subscribe()".
    const channel = supabase
      .channel(`activity:${eventId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_log",
          filter: `entity_id=eq.${eventId}`,
        },
        async (payload) => {
          // Hydrate the new row with joined actor/event/guest fields.
          // The minimum we need: id, action, context, created_at, actor.
          const newRaw = payload.new as {
            id: string;
            action: string;
            context: Record<string, unknown> | null;
            created_at: string;
            actor_user_id: string | null;
          };
          let actorName: string | null = null;
          if (newRaw.actor_user_id) {
            const { data: a } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newRaw.actor_user_id)
              .maybeSingle<{ full_name: string | null }>();
            actorName = a?.full_name ?? null;
          }
          const row: FeedRow = {
            id: newRaw.id,
            action: newRaw.action,
            context: newRaw.context,
            created_at: newRaw.created_at,
            actor: { full_name: actorName },
          };
          setRows((prev) => {
            // Dedupe — server SSR may have included this id already if the
            // realtime event raced.
            if (prev.some((r) => r.id === row.id)) return prev;
            return [row, ...prev].slice(0, 50);
          });
          setPulseIds((prev) => new Set(prev).add(row.id));
          setTimeout(() => {
            setPulseIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }, 2200);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // ActivityFeed renders the list; we add a thin pulse border on rows that
  // are still in pulseIds. Easiest: pass-through to ActivityFeed by wrapping
  // each row's id in a CSS class via a sibling animator. To keep the change
  // small, use a global CSS animation triggered by data-attr.
  return (
    <div data-pulse-ids={[...pulseIds].join(",")}>
      <style>{`
        [data-row-id] {
          transition: box-shadow 0.4s ease;
        }
        [data-row-id].wadl-pulse-row {
          box-shadow: 0 0 0 2px oklch(0.7 0.24 260 / 0.35);
        }
      `}</style>
      <ActivityFeed
        rows={rows}
        showEvent={showEvent}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
      />
    </div>
  );
}
