"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/owner/analytics", label: "Overview", exact: true },
  { href: "/owner/analytics/attendance", label: "Attendance" },
  { href: "/owner/analytics/scorecards", label: "Scorecards" },
  { href: "/owner/analytics/guests", label: "Guests" },
  { href: "/owner/analytics/capacity", label: "Capacity" },
  { href: "/owner/analytics/tonight", label: "Tonight live" },
  { href: "/owner/analytics/compare", label: "Compare" },
];

export default function AnalyticsTabs() {
  const path = usePathname() ?? "";
  return (
    <nav
      aria-label="Analytics sections"
      style={{
        borderBottom: "1px solid var(--line)",
        padding: "0 var(--s-8)",
        display: "flex",
        gap: "var(--s-1)",
        overflowX: "auto",
      }}
    >
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "var(--s-4)",
                color: active ? "var(--fg)" : "var(--fg-3)",
                fontSize: "var(--ts-md)",
                fontWeight: active ? 500 : 400,
                borderBottom: active
                  ? "2px solid var(--fg)"
                  : "2px solid transparent",
                marginBottom: -1,
                whiteSpace: "nowrap",
                transition: "color .12s",
              }}
            >
              {t.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
