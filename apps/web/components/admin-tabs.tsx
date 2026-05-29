"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Stats", exact: true },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/operations", label: "Ops" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/activity", label: "Activity" },
];

export default function AdminTabs() {
  const path = usePathname() ?? "";
  return (
    <nav
      aria-label="Admin sections"
      style={{
        display: "flex",
        gap: "var(--s-1)",
        overflowX: "auto",
        padding: "0 var(--s-6) var(--s-2)",
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
            <span className={"nav-item" + (active ? " nav-item--active" : "")}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
