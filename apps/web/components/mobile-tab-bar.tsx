"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  icon: string; // SVG path data
  matchPrefix?: string;
}

const TABS: Tab[] = [
  {
    href: "/owner",
    label: "Today",
    matchPrefix: "/owner/events",
    icon: "M3 12l9-9 9 9 M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10",
  },
  {
    href: "/owner/calendar",
    label: "Calendar",
    icon: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  {
    href: "/owner/holders",
    label: "Promoters",
    icon: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/owner/notifications",
    label: "Inbox",
    icon: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0",
  },
  {
    href: "/owner/profile",
    label: "Profile",
    icon: "M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
];

export default function MobileTabBar({ unread = 0 }: { unread?: number }) {
  const path = usePathname() ?? "";
  // CSS for .w-tab-bar / .w-tab-bar-spacer lives in globals.css to keep
  // SSR + client renders byte-identical (avoids hydration mismatch).
  return (
    <>
      <nav
        className="w-tab-bar"
        aria-label="Primary"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 25,
          background: "var(--w-surface-2)",
          borderTop: "1px solid var(--w-line)",
          display: "grid",
          gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((t) => {
          const active = t.matchPrefix
            ? path === t.href || path.startsWith(t.matchPrefix)
            : path === t.href || path.startsWith(t.href + "/");
          const showBadge = t.href === "/owner/notifications" && unread > 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 4px",
                color: active ? "var(--w-acc)" : "var(--w-fg-muted)",
                textDecoration: "none",
                fontFamily: "var(--w-mono)",
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                gap: 4,
                transition: "color 0.15s ease",
              }}
            >
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 2,
                    background: "var(--w-acc)",
                  }}
                />
              )}
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 2 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={t.icon} />
              </svg>
              {t.label}
              {showBadge && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: "calc(50% - 18px)",
                    minWidth: 14,
                    height: 14,
                    padding: "0 4px",
                    background: "var(--w-acc)",
                    color: "var(--w-acc-ink)",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="w-tab-bar-spacer" aria-hidden="true" />
    </>
  );
}
