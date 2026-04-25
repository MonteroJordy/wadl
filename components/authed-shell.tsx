"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface NavItem {
  href: string;
  label: string;
  /** Path prefix that should also activate this item. */
  matchPrefix?: string;
  /** Optional badge count rendered next to the label. */
  badge?: number;
}

interface UserSummary {
  full_name: string | null;
  phone: string | null;
}

interface AccountSummary {
  display_name: string;
  account_type: string;
}

interface Props {
  children: React.ReactNode;
  user: UserSummary;
  account: AccountSummary | null;
  sections: NavSection[];
  brand: string;
  brandSub?: string;
  brandTone?: "coral" | "gold" | "mint";
  /** Right-aligned items rendered in a sticky top bar above the children. */
  topBarRight?: React.ReactNode;
}

export default function AuthedShell({
  children,
  user,
  account,
  sections,
  brand,
  brandSub,
  brandTone = "coral",
  topBarRight,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() ?? "";

  function isActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
    return false;
  }

  const toneText =
    brandTone === "gold"
      ? "text-gold"
      : brandTone === "mint"
      ? "text-mint"
      : "text-coral";

  const initial =
    (user.full_name ?? "")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="md:flex min-h-screen">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-md bg-s2 border border-line flex items-center justify-center text-cream"
        aria-label="Open navigation"
      >
        <span className="font-display text-xl leading-none">≡</span>
      </button>

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="md:hidden fixed inset-0 bg-bg/80 backdrop-blur-sm z-30"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky md:top-0 inset-y-0 left-0 w-64 bg-s1 border-r border-line z-40 flex flex-col transform transition-transform duration-200 md:translate-x-0 md:h-screen ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6 border-b border-line">
          <p className={`font-display text-2xl tracking-wide ${toneText}`}>
            {brand}
          </p>
          {brandSub && (
            <p className="label-mono mt-1 truncate">{brandSub}</p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="label-mono px-5 mb-1">{section.label}</p>
              <ul>
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center justify-between px-5 py-2.5 font-sans text-sm transition border-l-2 ${
                          active
                            ? "border-coral bg-coral/10 text-cream"
                            : "border-transparent text-muted hover:text-cream hover:bg-s2"
                        }`}
                      >
                        <span>{item.label}</span>
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-coral text-bg text-[10px] font-mono font-semibold">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-line">
          <Link
            href="/owner/profile"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 p-2 rounded hover:bg-s2 transition"
          >
            <div className="w-9 h-9 rounded-full bg-coral/30 flex items-center justify-center font-sans font-semibold text-cream text-sm shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-cream truncate">
                {user.full_name || "Profile"}
              </p>
              {account && (
                <p className="label-mono truncate">{account.display_name}</p>
              )}
            </div>
          </Link>
          <form action="/api/auth/signout" method="post" className="mt-1">
            <button
              type="submit"
              className="w-full text-left label-mono px-2 py-2 hover:text-cream transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {topBarRight && (
          <div className="sticky top-0 z-20 bg-bg/85 backdrop-blur-sm border-b border-line px-4 md:px-6 py-2 flex items-center justify-end gap-2 md:pl-6 pl-14">
            {topBarRight}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
