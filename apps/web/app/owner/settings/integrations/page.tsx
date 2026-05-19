import { requireOwnerContext } from "@/lib/owner";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

interface Row {
  name: string;
  desc: string;
  connected: boolean;
  href?: string;
}

const ROWS: Row[] = [
  { name: "Slack", desc: "Door alerts", connected: false },
  { name: "Resident Advisor", desc: "Auto-publish", connected: false },
  { name: "Apple Wallet", desc: "Passes", connected: true },
  { name: "Google Calendar", desc: "Sync", connected: false },
  { name: "Instagram", desc: "Auto-post", connected: false },
  { name: "Webhooks", desc: "HTTP", connected: true, href: "/owner/webhooks" },
];

export default async function IntegrationsSettings() {
  await requireOwnerContext();
  return (
    <SettingsShell
      active="integrations"
      eyebrow="Settings · integrations"
      title="Integrations"
      sub="Connect the door to the rest of your stack."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--s-3)",
          maxWidth: 880,
        }}
        className="integrations-grid"
      >
        {ROWS.map((r) => (
          <div
            key={r.name}
            className="card"
            style={{
              padding: "var(--s-5)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--s-4)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="t-h1 truncate">{r.name}</div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                {r.desc}
              </div>
            </div>
            {r.href ? (
              <a
                href={r.href}
                className={
                  "btn btn--sm " + (r.connected ? "btn--ghost" : "")
                }
                style={{ textDecoration: "none" }}
              >
                {r.connected ? "Manage" : "Connect"}
              </a>
            ) : (
              <button
                type="button"
                className={
                  "btn btn--sm " + (r.connected ? "btn--ghost" : "")
                }
                disabled={!r.connected}
              >
                {r.connected ? "Connected" : "Connect"}
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 720px) {
          .integrations-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SettingsShell>
  );
}
