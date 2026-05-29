import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsShell } from "@/components/v5/settings-shell";

export const dynamic = "force-dynamic";

export default async function DevelopersSettings() {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  // Best-effort: look up webhooks if the table exists.
  let webhooks: Array<{ url: string; events: string[]; status?: string | null }> = [];
  try {
    const { data } = await admin
      .from("webhooks")
      .select("url, event_types, last_status")
      .eq("account_id", account.id);
    webhooks = (data ?? []).map((w) => ({
      url: w.url,
      events: Array.isArray(w.event_types) ? w.event_types : [],
      status: w.last_status,
    }));
  } catch {
    /* table may not exist */
  }

  return (
    <SettingsShell
      active="developers"
      eyebrow="Settings · developers"
      title="API & webhooks"
      actions={
        <Link
          href="/owner/webhooks"
          className="btn btn--accent"
          style={{ textDecoration: "none" }}
        >
          Manage webhooks
        </Link>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--s-4)",
        }}
        className="dev-grid"
      >
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            API tokens
          </div>
          <div
            className="card"
            style={{ padding: "var(--s-5)", color: "var(--fg-3)" }}
          >
            <span className="t-body-2">
              API tokens land with the public API. For now, server-to-server
              traffic uses Supabase service-role keys (managed via the dashboard).
            </span>
          </div>
        </div>
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Webhooks · {webhooks.length}
          </div>
          {webhooks.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "var(--s-5)",
                color: "var(--fg-3)",
              }}
            >
              <span className="t-body-2">
                No webhooks configured.{" "}
                <Link
                  href="/owner/webhooks"
                  style={{ color: "var(--fg)" }}
                >
                  Add one →
                </Link>
              </span>
            </div>
          ) : (
            <div className="card">
              {webhooks.slice(0, 4).map((w, i) => (
                <div
                  key={i}
                  className="row"
                  style={{ display: "block", padding: "var(--s-4) var(--s-5)" }}
                >
                  <div
                    className="t-h2 truncate"
                    style={{ fontFamily: "var(--mono)", fontSize: 12 }}
                  >
                    {w.url}
                  </div>
                  <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                    {w.events.length === 0 ? "all events" : w.events.join(" · ")}
                  </div>
                  <div
                    className="t-meta"
                    style={{
                      marginTop: "var(--s-1)",
                      color:
                        w.status === "ok" || w.status === "200"
                          ? "var(--ok)"
                          : "var(--fg-3)",
                    }}
                  >
                    {w.status ?? "—"} last
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .dev-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SettingsShell>
  );
}
