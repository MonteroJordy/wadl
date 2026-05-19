import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/v5";

const TABS: Array<{ id: string; label: string; href: string }> = [
  { id: "venue", label: "Venue", href: "/owner/settings" },
  { id: "branding", label: "Branding", href: "/owner/settings/branding" },
  { id: "notifications", label: "Notifications", href: "/owner/profile/notifications" },
  { id: "integrations", label: "Integrations", href: "/owner/settings/integrations" },
  { id: "developers", label: "Developers", href: "/owner/settings/developers" },
  { id: "privacy", label: "Privacy", href: "/owner/settings/privacy" },
  { id: "danger", label: "Danger", href: "/owner/settings/danger" },
];

/**
 * Shared shell for /owner/settings/* — sidebar nav on the left, page
 * content on the right. Mirrors V5VenueSettings from the v5 handoff.
 */
export function SettingsShell({
  active,
  title,
  eyebrow,
  sub,
  actions,
  children,
}: {
  active: string;
  title: string;
  eyebrow?: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader eyebrow={eyebrow} title={title} sub={sub} actions={actions} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: 600,
        }}
        className="settings-grid"
      >
        <aside
          style={{
            borderRight: "1px solid var(--line)",
            padding: "var(--s-4)",
          }}
        >
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={"nav-item " + (active === t.id ? "nav-item--active" : "")}
              style={{
                display: "block",
                marginBottom: "var(--s-1)",
                textDecoration: "none",
              }}
            >
              {t.label}
            </Link>
          ))}
        </aside>
        <section style={{ padding: "var(--s-8)" }}>{children}</section>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .settings-grid { grid-template-columns: 1fr !important; }
          .settings-grid aside { border-right: 0; border-bottom: 1px solid var(--line); }
        }
      `}</style>
    </main>
  );
}
