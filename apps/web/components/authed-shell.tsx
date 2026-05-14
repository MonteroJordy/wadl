"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/v5";
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

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((s) => s[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Authed app shell — v5 design. A fixed left sidebar on tablet+ that
 * slides in as a drawer on mobile. Restyled to the v5 token system:
 * near-black surfaces, .nav-item classes, v5 Logo, rounded radii,
 * 4pt-grid spacing. Layout structure (.w-shell / .w-aside-tablet /
 * .w-content / .w-topbar rules in globals.css) is unchanged so the
 * 60+ pages that compose inside it keep working.
 */
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

  // ESC closes the mobile drawer; lock body scroll while it's open.
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

  // Close drawer when route changes.
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
      className="w-app w-shell v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      {/* Mobile hamburger — v5 ghost-button styling, rounded. */}
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
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          color: "var(--fg)",
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

      {/* Mobile backdrop — fades in/out with the drawer. */}
      <div
        onClick={() => setDrawerOpen(false)}
        className="w-mobile-chrome"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,10,10,0.78)",
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
          background: "var(--bg)",
          borderRight: "1px solid var(--line)",
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
          boxShadow: drawerOpen ? "8px 0 32px rgba(0,0,0,0.45)" : "none",
        }}
      >
        {/* Brand + account chip */}
        <div
          style={{
            padding: "var(--s-5) var(--s-4)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ paddingLeft: "var(--s-1)" }}>
            <Logo size={18} />
          </div>
          <div
            style={{
              marginTop: "var(--s-4)",
              padding: "var(--s-3)",
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: "var(--r-pill)",
                background: "var(--bg-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--w-display)",
              }}
            >
              {initials(brand)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-h2 truncate">{brand}</div>
              {brandSub && (
                <div className="t-meta" style={{ marginTop: 2 }}>
                  {brandSub}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--s-3) var(--s-2)",
          }}
        >
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: "var(--s-4)" }}>
              <div
                className="t-meta"
                style={{
                  padding: "0 var(--s-3)",
                  marginBottom: "var(--s-1)",
                }}
              >
                {section.label}
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
                        className={
                          "nav-item " + (active ? "nav-item--active" : "")
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          textDecoration: "none",
                          marginBottom: 2,
                        }}
                      >
                        <span>{item.label}</span>
                        {typeof item.badge === "number" &&
                          item.badge > 0 && (
                            <span className="badge">
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

        {/* Footer — profile + sign out + shortcuts */}
        <div
          style={{
            padding: "var(--s-2)",
            borderTop: "1px solid var(--line)",
          }}
        >
          <Link
            href="/owner/profile"
            onClick={() => setDrawerOpen(false)}
            className="nav-item"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: "var(--r-pill)",
                background: "var(--bg-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--w-display)",
                color: "var(--fg)",
              }}
            >
              {initials(user.full_name ?? "?")}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="t-h2 truncate" style={{ color: "var(--fg)" }}>
                {user.full_name || "Profile"}
              </div>
              {account && (
                <div className="t-meta truncate" style={{ marginTop: 1 }}>
                  {account.display_name}
                </div>
              )}
            </div>
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "var(--s-1)",
              paddingLeft: "var(--s-3)",
            }}
          >
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="t-meta"
                style={{
                  textAlign: "left",
                  padding: "var(--s-2) 0",
                  background: "transparent",
                  border: 0,
                  color: "var(--fg-3)",
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
              className="kbd"
              style={{ cursor: "pointer", border: 0 }}
            >
              ?
            </button>
          </div>
        </div>
      </aside>

      <div style={{ minWidth: 0, flex: "1 1 auto" }} className="w-content">
        {topBarRight && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "rgba(10,10,10,0.85)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid var(--line)",
              padding: "var(--s-2) var(--s-6) var(--s-2) 64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "var(--s-2)",
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
