import { requireOwnerContext } from "@/lib/owner";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

const ACTIONS: Array<{ name: string; desc: string; danger?: boolean }> = [
  { name: "Transfer venue", desc: "Hand off ownership" },
  { name: "Archive all events", desc: "Hide from history" },
  {
    name: "Delete venue",
    desc: "Cannot undo · 30 day grace",
    danger: true,
  },
];

export default async function DangerSettings() {
  await requireOwnerContext();
  return (
    <SettingsShell
      active="danger"
      eyebrow="Settings · danger zone"
      title="Danger"
      sub="Irreversible. Each requires re-auth."
    >
      <div
        style={{
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-2)",
        }}
      >
        {ACTIONS.map((a) => (
          <div
            key={a.name}
            className="card"
            style={{
              padding: "var(--s-5)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--s-4)",
              borderColor: a.danger ? "rgba(248,113,113,0.4)" : "var(--line)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                className="t-h1"
                style={{ color: a.danger ? "var(--err)" : "var(--fg)" }}
              >
                {a.name}
              </div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                {a.desc}
              </div>
            </div>
            <button
              type="button"
              className={a.danger ? "btn btn--danger" : "btn btn--ghost"}
              disabled
            >
              {a.danger ? "Delete" : "Run"}
            </button>
          </div>
        ))}
      </div>
      <p
        className="t-meta"
        style={{ marginTop: "var(--s-8)", color: "var(--fg-3)" }}
      >
        Re-auth + soft-delete flows ship before these buttons become live.
      </p>
    </SettingsShell>
  );
}
