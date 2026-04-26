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
      className="flex gap-1 overflow-x-auto pb-2 mb-6"
    >
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              active
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
