"use client";

import Link from "next/link";

interface Props {
  unread: number;
  href?: string;
}

export default function NotificationBell({ unread, href = "/owner/notifications" }: Props) {
  return (
    <Link
      href={href}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-line text-cream hover:border-cream/30 transition"
    >
      <span aria-hidden="true" className="font-display text-lg leading-none">
        ◔
      </span>
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-bg text-[10px] font-mono font-semibold"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
