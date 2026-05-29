import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";
import ToggleButton from "./toggle-button";

export const dynamic = "force-dynamic";

const COLS = "1.2fr 2fr 90px 90px 1fr 110px";

interface FlagRow {
  key: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
  rollout_target: string | null;
  updated_at: string;
}

export default async function AdminFeatureFlagsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feature_flags")
    .select("*")
    .order("key");
  const flags = (data ?? []) as FlagRow[];

  return (
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Feature flags"
        sub="Toggle on/off live. Rollout % + target stay editable via SQL for now."
      />
      <div style={{ padding: "var(--s-8)" }}>
        {flags.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
            }}
          >
            <div className="t-h1">No flags seeded</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Run the migration to populate the starter flag set.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <div
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-3) var(--s-5)",
                background: "var(--bg)",
              }}
            >
              {["Key", "Description", "Status", "Rollout", "Target", "Updated"].map(
                (h) => (
                  <span key={h} className="t-meta">
                    {h}
                  </span>
                ),
              )}
            </div>
            {flags.map((f) => (
              <div
                key={f.key}
                className="row"
                style={{
                  gridTemplateColumns: COLS,
                  padding: "var(--s-4) var(--s-5)",
                }}
              >
                <span
                  className="t-body-2"
                  style={{ fontFamily: "var(--mono)", color: "var(--fg)" }}
                >
                  {f.key}
                </span>
                <span className="t-body-2 truncate">
                  {f.description ?? ""}
                </span>
                <span>
                  <ToggleButton flagKey={f.key} enabled={f.enabled} />
                </span>
                <span className="t-body-2 t-num">{f.rollout_pct}%</span>
                <span className="t-body-2">{f.rollout_target ?? "—"}</span>
                <span className="t-meta">
                  {new Date(f.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
