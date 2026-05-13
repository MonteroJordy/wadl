"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@/components/wadl";

const TABS = [
  { href: "/owner/analytics", label: "OVERVIEW", exact: true },
  { href: "/owner/analytics/attendance", label: "ATTENDANCE" },
  { href: "/owner/analytics/scorecards", label: "SCORECARDS" },
  { href: "/owner/analytics/guests", label: "GUESTS" },
  { href: "/owner/analytics/capacity", label: "CAPACITY" },
  { href: "/owner/analytics/tonight", label: "TONIGHT LIVE" },
  { href: "/owner/analytics/compare", label: "COMPARE" },
];

export default function AnalyticsTabs() {
  const path = usePathname() ?? "";
  return (
    <nav
      aria-label="Analytics sections"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 8,
      }}
    >
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{ textDecoration: "none", flexShrink: 0 }}
          >
            <Chip tone={active ? "acc" : "ghost"}>{t.label}</Chip>
          </Link>
        );
      })}
    </nav>
  );
}
