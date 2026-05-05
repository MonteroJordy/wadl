"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconHome,
  IconList,
  IconWallet,
  IconUser,
  IconCal,
  IconStaff,
  IconAnalytics,
} from "./icons";

export type TabKey =
  | "home"
  | "lists"
  | "wallet"
  | "profile"
  | "events"
  | "staff"
  | "analytics"
  | "door"
  | "assignments";

interface TabItem {
  key: TabKey;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface TabBarProps {
  active: TabKey;
  items: TabItem[];
}

const LABELS: Record<TabKey, string> = {
  home: "Home",
  lists: "Lists",
  wallet: "Wallet",
  profile: "Profile",
  events: "Events",
  staff: "Staff",
  analytics: "Stats",
  door: "Door",
  assignments: "Schedule",
};

const ICONS: Record<TabKey, React.ReactNode> = {
  home: <IconHome />,
  lists: <IconList />,
  wallet: <IconWallet />,
  profile: <IconUser />,
  events: <IconCal />,
  staff: <IconStaff />,
  analytics: <IconAnalytics />,
  door: <IconHome />,
  assignments: <IconCal />,
};

/**
 * Build a tab item with sensible defaults — caller can override label/icon.
 */
export function tab(key: TabKey, href: string, override?: Partial<TabItem>): TabItem {
  return {
    key,
    href,
    label: override?.label ?? LABELS[key],
    icon: override?.icon ?? ICONS[key],
  };
}

export function TabBar({ active, items }: TabBarProps) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 28,
        paddingTop: 8,
        background:
          "linear-gradient(to top, var(--w-bg) 70%, transparent)",
        borderTop: "1px solid var(--w-line)",
        display: "flex",
        justifyContent: "space-around",
        zIndex: 10,
      }}
    >
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              background: "transparent",
              border: 0,
              color: isActive ? "var(--w-fg)" : "var(--w-fg-dim)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 12px",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "inherit" }}>{it.icon}</span>
            <span
              className="w-type-meta"
              style={{ color: "inherit", fontSize: 9 }}
            >
              {it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
