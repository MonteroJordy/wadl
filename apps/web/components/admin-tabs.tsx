"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Stats", exact: true },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/activity", label: "Activity" },
];

export default function AdminTabs() {
  const path = usePathname() ?? "";
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 overflow-x-auto px-4 md:px-8 pb-2"
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
