import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";
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
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Feature flags</h1>
      <p className="label-mono mb-6">
        Toggle on/off live. Rollout % + target stay editable via SQL for now.
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
                  <td className="py-2">
                    <ToggleButton flagKey={f.key} enabled={f.enabled} />
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
