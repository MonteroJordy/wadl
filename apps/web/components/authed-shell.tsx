"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Wordmark } from "@/components/wadl";
import { openShortcutHelp } from "@/components/shortcut-help";

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface NavItem {
  href: string;
  label: string;
  matchPrefix?: string;
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
  topBarRight?: React.ReactNode;
}

export default function AuthedShell({
  children,
  user,
  account,
  sections,
  brand,
  brandSub,
  topBarRight,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() ?? "";

  // ESC closes the mobile drawer. Lock body scroll while it's open so
  // the page behind doesn't scroll on iOS overscroll.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // Close drawer when route changes (Link clicks already wire this up,
  // but this catches programmatic navigations too).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function isActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
    return false;
  }

  return (
    <div
      className="w-app w-shell"
      style={{ minHeight: "100vh", background: "var(--w-bg)" }}
    >
      {/* .w-mobile-chrome / .w-aside-tablet / .w-content / .w-topbar
          rules live in globals.css to keep SSR/client byte-identical. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="w-mobile-chrome"
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        aria-controls="w-sidebar"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 30,
          width: 40,
          height: 40,
          borderRadius: 0,
          background: "var(--w-surface-2)",
          border: "1px solid var(--w-line)",
          color: "var(--w-fg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontFamily: "var(--w-mono)",
          cursor: "pointer",
        }}
      >
        ≡
      </button>

      {/* Mobile backdrop — fades in/out smoothly with the drawer. */}
      <div
        onClick={() => setDrawerOpen(false)}
        className="w-mobile-chrome"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,15,16,0.78)",
          backdropFilter: drawerOpen ? "blur(6px)" : "blur(0)",
          zIndex: 30,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition:
            "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1), backdrop-filter 280ms",
        }}
      />

      <aside
        id="w-sidebar"
        className="w-aside-tablet"
        aria-label="Primary navigation"
        style={{
          width: 256,
          background: "var(--w-surface-2)",
          borderRight: "1px solid var(--w-line)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
          boxShadow: drawerOpen
            ? "8px 0 32px rgba(0,0,0,0.45)"
            : "none",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--w-line)",
          }}
        >
          <Wordmark variant="monogrid" size={20} />
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: "#ffffff05",
              border: "1px solid var(--w-line)",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Avatar
              name={brand
                .split(" ")
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase()}
              size={32}
              accent
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {brand}
              </div>
              {brandSub && (
                <div className="w-type-meta" style={{ marginTop: 2, fontSize: 9 }}>
                  {brandSub.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: 16 }}>
              <div
                className="w-type-meta"
                style={{ padding: "0 20px", marginBottom: 4 }}
              >
                {section.label.toUpperCase()}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {section.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={active ? "page" : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 20px",
                          fontSize: 14,
                          fontWeight: active ? 600 : 500,
                          textDecoration: "none",
                          background: active ? "#ffffff10" : "transparent",
                          color: active
                            ? "var(--w-fg)"
                            : "var(--w-fg-muted)",
                          borderLeft: active
                            ? "2px solid var(--w-acc)"
                            : "2px solid transparent",
                          transition: "background 0.12s, color 0.12s",
                        }}
                      >
                        <span>{item.label}</span>
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              minWidth: 20,
                              height: 18,
                              padding: "0 6px",
                              borderRadius: 999,
                              background: "var(--w-acc)",
                              color: "var(--w-acc-ink)",
                              fontSize: 10,
                              fontFamily: "var(--w-mono)",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
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

        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--w-line)",
          }}
        >
          <Link
            href="/owner/profile"
            onClick={() => setDrawerOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 8,
              borderRadius: 0,
              textDecoration: "none",
              color: "inherit",
              transition: "background 0.12s",
            }}
          >
            <Avatar
              name={(user.full_name ?? "?").slice(0, 2).toUpperCase()}
              size={36}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.full_name || "Profile"}
              </div>
              {account && (
                <div
                  className="w-type-meta"
                  style={{
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {account.display_name.toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-type-meta"
                style={{
                  textAlign: "left",
                  padding: "8px",
                  background: "transparent",
                  border: 0,
                  color: "var(--w-fg-dim)",
                  cursor: "pointer",
                }}
              >
                SIGN OUT
              </button>
            </form>
            <button
              type="button"
              onClick={() => openShortcutHelp()}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (press ?)"
              className="w-type-meta"
              style={{
                padding: "8px 10px",
                background: "transparent",
                border: 0,
                color: "var(--w-fg-dim)",
                cursor: "pointer",
                fontFamily: "var(--w-mono)",
              }}
            >
              ?
            </button>
          </div>
        </div>
      </aside>

      <div
        style={{ minWidth: 0, flex: "1 1 auto" }}
        className="w-content"
      >
        {topBarRight && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "rgba(15,15,16,0.85)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid var(--w-line)",
              padding: "8px 24px 8px 64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
            }}
            className="w-topbar"
          >
            {topBarRight}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
