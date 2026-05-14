"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/v5";

/**
 * V5Shell — the v5 web app shell. A 56px horizontal top nav (Logo +
 * context + primary nav + ⌘K + avatar), exactly the `TopNav` from
 * Wadl v5.html. Replaces the old left `AuthedShell` sidebar.
 *
 * v5's web nav is intentionally minimal — 4 primary destinations.
 * Everything else (settings sub-pages, sms log, payouts, billing,
 * preview-as, admin) is reachable via the account menu + ⌘K palette.
 */

export interface V5NavItem {
  href: string;
  label: string;
  matchPrefix?: string;
}

interface AccountMenuItem {
  href: string;
  label: string;
  danger?: boolean;
}

interface Props {
  children: React.ReactNode;
  /** Primary nav — 4 items, the v5 TopNav pattern. */
  nav: V5NavItem[];
  /** Context label, e.g. "Wynwood Studios · Owner". */
  context: string;
  /** Avatar initials. */
  initials: string;
  /** Items in the avatar dropdown (settings, billing, sign out, etc.). */
  accountMenu: AccountMenuItem[];
  /** Unread notification count for the bell. */
  unread?: number;
  /** Right-side slot (NotificationBell, CommandPalette trigger…). */
  topBarRight?: React.ReactNode;
}

export default function V5Shell({
  children,
  nav,
  context,
  initials,
  accountMenu,
  topBarRight,
}: Props) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ESC closes any open menu; body scroll-lock for the mobile sheet.
  useEffect(() => {
    if (!menuOpen && !mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, mobileOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  function isActive(item: V5NavItem): boolean {
    if (pathname === item.href) return true;
    if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
    return false;
  }

  return (
    <div
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      {/* ─── 56px horizontal top nav ─── */}
      <header
        style={{
          height: 56,
          padding: "0 var(--s-6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--s-8)",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        {/* brand + context */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            flexShrink: 0,
          }}
        >
          <Link href="/owner" aria-label="WADL home">
            <Logo size={18} />
          </Link>
          <span
            className="t-meta"
            style={{
              paddingLeft: "var(--s-2)",
              borderLeft: "1px solid var(--line)",
              marginLeft: "var(--s-2)",
            }}
          >
            {context}
          </span>
        </div>

        {/* primary nav — hidden on narrow screens, shown via mobile sheet */}
        <nav
          className="v5-topnav"
          style={{ display: "flex", gap: "var(--s-1)", flex: 1 }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={
                "nav-item " + (isActive(item) ? "nav-item--active" : "")
              }
              style={{ textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* right cluster */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {topBarRight}
          {/* account avatar + dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--r-pill)",
                background: "var(--bg-3)",
                color: "var(--fg)",
                border: 0,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--display)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials}
            </button>
            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div
                  role="menu"
                  className="card"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 220,
                    zIndex: 41,
                    padding: "var(--s-1)",
                    background: "var(--bg-2)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  }}
                >
                  {accountMenu.map((m) =>
                    m.href === "__signout__" ? (
                      <form
                        key={m.href}
                        action="/api/auth/signout"
                        method="post"
                      >
                        <button
                          type="submit"
                          className="nav-item"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: "transparent",
                            border: 0,
                            cursor: "pointer",
                            color: "var(--err)",
                          }}
                        >
                          {m.label}
                        </button>
                      </form>
                    ) : (
                      <Link
                        key={m.href}
                        href={m.href}
                        role="menuitem"
                        className="nav-item"
                        style={{
                          display: "block",
                          textDecoration: "none",
                          color: m.danger ? "var(--err)" : undefined,
                        }}
                      >
                        {m.label}
                      </Link>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
          {/* mobile nav toggle */}
          <button
            type="button"
            className="v5-topnav-mobile-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            style={{
              display: "none",
              width: 32,
              height: 32,
              borderRadius: "var(--r-sm)",
              background: "var(--bg-3)",
              border: 0,
              color: "var(--fg)",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: 16,
            }}
          >
            ≡
          </button>
        </div>
      </header>

      {/* mobile nav sheet */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: "56px 0 0 0",
            zIndex: 29,
            background: "var(--bg)",
            padding: "var(--s-4)",
          }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                "nav-item " + (isActive(item) ? "nav-item--active" : "")
              }
              style={{
                display: "block",
                textDecoration: "none",
                marginBottom: "var(--s-1)",
                padding: "var(--s-3)",
                fontSize: "var(--ts-lg)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* children already provide their own <main id="main-content"> */}
      <div>{children}</div>

      <style>{`
        @media (max-width: 760px) {
          .v5-topnav { display: none !important; }
          .v5-topnav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
