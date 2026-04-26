"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  unread: number;
  href?: string;
  /** Account ID to subscribe for realtime new-notification inserts. */
  accountId?: string;
}

/**
 * Day 35 — bell with optional Supabase Realtime subscription so the
 * unread count bumps the moment a new notification lands, no page
 * refresh. Falls back to the server-rendered initial count when
 * realtime isn't available or accountId is unset.
 */
export default function NotificationBell({
  unread: initialUnread,
  href = "/owner/notifications",
  accountId,
}: Props) {
  const [unread, setUnread] = useState(initialUnread);
  const [pulsing, setPulsing] = useState(false);

  // Sync if parent re-renders with a fresh server-side count.
  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  // Realtime subscription — INSERT on notifications for this account.
  useEffect(() => {
    if (!accountId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notif-bell:${accountId}`)
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
          // Pulse for 2s, then settle.
          setTimeout(() => setPulsing(false), 2000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  return (
    <Link
      href={href}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-md border text-cream hover:border-cream/30 transition ${
        pulsing ? "border-coral" : "border-line"
      }`}
    >
      <span aria-hidden="true" className="font-display text-lg leading-none">
        ◔
      </span>
      {unread > 0 && (
        <span
          aria-hidden="true"
          className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-bg text-[10px] font-mono font-semibold ${
            pulsing ? "animate-ping-once" : ""
          }`}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      <style jsx>{`
        @keyframes ping-once {
          0% { box-shadow: 0 0 0 0 rgba(255, 74, 43, 0.7); }
          100% { box-shadow: 0 0 0 12px rgba(255, 74, 43, 0); }
        }
        :global(.animate-ping-once) {
          animation: ping-once 1.4s ease-out;
        }
      `}</style>
    </Link>
  );
}
