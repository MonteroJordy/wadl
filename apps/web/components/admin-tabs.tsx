"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip } from "@/components/wadl";

const TABS = [
  { href: "/admin", label: "STATS", exact: true },
  { href: "/admin/accounts", label: "ACCOUNTS" },
  { href: "/admin/events", label: "EVENTS" },
  { href: "/admin/guests", label: "GUESTS" },
  { href: "/admin/billing", label: "BILLING" },
  { href: "/admin/operations", label: "OPS" },
  { href: "/admin/support", label: "SUPPORT" },
  { href: "/admin/feature-flags", label: "FLAGS" },
  { href: "/admin/activity", label: "ACTIVITY" },
];

export default function AdminTabs() {
  const path = usePathname() ?? "";
  return (
    <nav
      aria-label="Admin sections"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "0 24px 12px",
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
