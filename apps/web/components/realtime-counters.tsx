"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mounts on the daydash and listens for changes on guests + check_ins for
 * the given event_night_id. Calls router.refresh() when something happens
 * so the server-rendered counters re-fetch. Debounced to avoid storms.
 */
export default function RealtimeCounters({ nightId }: { nightId: string }) {
  const router = useRouter();
  const [pulse, setPulse] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function refresh(label: string) {
      setPulse(label);
      if (pending) return;
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        router.refresh();
      }, 600);
    }

    // Unique per-mount suffix prevents Supabase from de-duping the
    // channel with a leftover instance from StrictMode's double-mount
    // (or a previous navigation), which would otherwise throw
    // "cannot add postgres_changes callbacks ... after subscribe()".
    const channel = supabase
      .channel(`night-${nightId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "check_ins",
          filter: `event_night_id=eq.${nightId}`,
        },
        () => refresh("scan"),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `event_night_id=eq.${nightId}`,
        },
        () => refresh("rsvp"),
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [nightId, router]);

  const color = pulse ? "var(--w-ok)" : "var(--w-fg-muted)";

  return (
    <>
      <style>{`@keyframes wadlLivePulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      <span
        title={pulse ? `Last update: ${pulse}` : "Live"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 10px",
          border: `1px solid ${color}`,
          color,
          fontFamily: "var(--w-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            background: color,
            animation: pulse ? "wadlLivePulse 1s ease-in-out infinite" : undefined,
          }}
        />
        LIVE
      </span>
    </>
  );
}
