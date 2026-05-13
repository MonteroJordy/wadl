import { createAdminClient } from "@/lib/supabase/admin";
import ToggleButton from "./toggle-button";

export const dynamic = "force-dynamic";

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
    <main id="main-content" style={{ padding: "32px 24px 96px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">PLATFORM</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Feature flags
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Toggle on/off live. Rollout % + target stay editable via SQL for
            now.
          </p>
        </div>

        {flags.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No flags seeded</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Run the migration to populate the starter flag set.
            </p>
          </div>
        ) : (
          <section
            className="w-card"
            style={{ padding: 20, overflowX: "auto" }}
          >
            <table
              style={{
                width: "100%",
                fontSize: 14,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {[
                    ["KEY", "left"],
                    ["DESCRIPTION", "left"],
                    ["STATUS", "left"],
                    ["ROLLOUT", "right"],
                    ["TARGET", "left"],
                    ["UPDATED", "left"],
                  ].map(([h, align]) => (
                    <th
                      key={h}
                      className="w-type-meta"
                      style={{
                        textAlign: align as "left" | "right",
                        paddingBottom: 8,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => (
                  <tr
                    key={f.key}
                    style={{ borderTop: "1px solid var(--w-line)" }}
                  >
                    <td
                      style={{
                        padding: "10px 0",
                        fontFamily: "var(--w-mono)",
                        color: "var(--w-fg)",
                      }}
                    >
                      {f.key}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        color: "var(--w-fg-muted)",
                        fontSize: 12,
                        maxWidth: 360,
                      }}
                    >
                      {f.description ?? ""}
                    </td>
                    <td style={{ padding: "10px 0" }}>
                      <ToggleButton flagKey={f.key} enabled={f.enabled} />
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        textAlign: "right",
                        fontFamily: "var(--w-mono)",
                      }}
                    >
                      {f.rollout_pct}%
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0" }}
                    >
                      {(f.rollout_target ?? "—").toUpperCase()}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{
                        padding: "10px 0",
                        color: "var(--w-fg-muted)",
                      }}
                    >
                      {new Date(f.updated_at)
                        .toLocaleDateString()
                        .toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}
