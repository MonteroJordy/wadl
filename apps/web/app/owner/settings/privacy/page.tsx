import { requireOwnerContext } from "@/lib/owner";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

interface Toggle {
  name: string;
  on: boolean;
  desc: string;
  locked?: boolean;
}

const TOGGLES: Toggle[] = [
  {
    name: "Strikes follow guests across venues",
    on: false,
    desc: "Off by default · yours stay yours",
  },
  {
    name: "Allow data deletion",
    on: true,
    desc: "Required by GDPR",
    locked: true,
  },
  {
    name: "Friend graph on event pages",
    on: true,
    desc: "Show who else is going",
  },
  {
    name: "Sell to third parties",
    on: false,
    desc: "Always off · cannot enable",
    locked: true,
  },
];

export default async function PrivacySettings() {
  await requireOwnerContext();
  return (
    <SettingsShell
      active="privacy"
      eyebrow="Settings · privacy"
      title="Privacy"
      sub="What guests can do with their data on your venue."
    >
      <div
        style={{
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-2)",
        }}
      >
        {TOGGLES.map((t) => (
          <div
            key={t.name}
            className="card"
            style={{
              padding: "var(--s-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-4)",
              opacity: t.locked ? 0.7 : 1,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="t-h2">{t.name}</div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                {t.desc}
              </div>
            </div>
            <div
              aria-hidden
              style={{
                width: 34,
                height: 20,
                borderRadius: "var(--r-pill)",
                background: t.on ? "var(--fg)" : "var(--bg-3)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: t.on ? 16 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "var(--r-pill)",
                  background: t.on ? "var(--bg)" : "var(--fg-3)",
                  transition: "left 120ms ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p
        className="t-meta"
        style={{ marginTop: "var(--s-8)", color: "var(--fg-3)" }}
      >
        Toggles are visual today · privacy persistence ships with the venue
        settings migration.
      </p>
    </SettingsShell>
  );
}
