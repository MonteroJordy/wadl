"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mounts on the daydash and listens for changes on guests + check_ins for the
 * given event_night_id. Calls router.refresh() when something happens so the
 * server-rendered counters re-fetch. Debounced to avoid storms.
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

    const channel = supabase
      .channel(`night-${nightId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "check_ins",
          filter: `event_night_id=eq.${nightId}`,
        },
        () => refresh("scan")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
          filter: `event_night_id=eq.${nightId}`,
        },
        () => refresh("rsvp")
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [nightId, router]);

  return (
    <span
      className={`label-mono inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
        pulse
          ? "border-mint/60 text-mint"
          : "border-line text-muted"
      }`}
      title={pulse ? `Last update: ${pulse}` : "Live"}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          pulse ? "bg-mint animate-pulse" : "bg-muted"
        }`}
      />
      LIVE
    </span>
  );
}
