import { requireOwnerContext } from "@/lib/owner";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

export default async function BrandingSettings() {
  const { account } = await requireOwnerContext();
  const initials = account.name
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return (
    <SettingsShell
      active="branding"
      eyebrow="Settings · branding"
      title="Branding"
      sub="What guests see on event pages and credentials."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--s-8)",
          maxWidth: 980,
        }}
        className="branding-grid"
      >
        <div>
          <div className="t-meta">Logo</div>
          <div
            className="card"
            style={{
              marginTop: "var(--s-2)",
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-3)",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {initials}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: "var(--s-3)" }}
            disabled
          >
            Replace (coming soon)
          </button>
        </div>
        <div>
          <div className="t-meta">Voice</div>
          <select className="input" style={{ marginTop: "var(--s-2)" }} defaultValue="quiet">
            <option value="quiet">Quiet · understated</option>
            <option value="direct">Direct · plainspoken</option>
            <option value="loud">Loud · all-caps energy</option>
          </select>
          <div className="t-meta" style={{ marginTop: "var(--s-6)" }}>
            Cover style
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--s-2)",
              marginTop: "var(--s-2)",
            }}
          >
            {["Generated", "Photo", "Solid"].map((s, i) => (
              <div
                key={s}
                className="card card--hover"
                style={{
                  padding: "var(--s-3)",
                  textAlign: "center",
                  borderColor: i === 0 ? "var(--fg)" : "var(--line-2)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    height: 60,
                    background: "var(--bg-3)",
                    borderRadius: "var(--r-sm)",
                  }}
                />
                <div className="t-h2" style={{ marginTop: "var(--s-2)" }}>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p
        className="t-meta"
        style={{ marginTop: "var(--s-8)", color: "var(--fg-3)" }}
      >
        Save isn&apos;t wired yet — logo upload + voice persistence ships with the
        next branding migration.
      </p>
      <style>{`
        @media (max-width: 720px) {
          .branding-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SettingsShell>
  );
}
