import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

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
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Feature flags</h1>
      <p className="label-mono mb-6">
        Read-only registry. Toggle from SQL or the future flag-edit UI.
      </p>

      {flags.length === 0 ? (
        <EmptyState
          title="No flags seeded"
          body="Run the migration to populate the starter flag set."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-2">Key</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-right">Rollout</th>
                <th>Target</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.key} className="border-t border-line">
                  <td className="py-2 font-mono text-cream">{f.key}</td>
                  <td className="py-2 text-muted text-xs max-w-md">
                    {f.description ?? ""}
                  </td>
                  <td className="py-2 label-mono">
                    {f.enabled ? (
                      <span className="text-mint">live</span>
                    ) : f.rollout_target === "beta" ? (
                      <span className="text-gold">beta</span>
                    ) : f.rollout_target === "dev" ? (
                      <span className="text-coral">dev</span>
                    ) : (
                      <span className="text-muted">off</span>
                    )}
                  </td>
                  <td className="py-2 text-right">{f.rollout_pct}%</td>
                  <td className="py-2 label-mono">{f.rollout_target ?? "—"}</td>
                  <td className="py-2 label-mono text-muted">
                    {new Date(f.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
