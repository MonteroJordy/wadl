import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";

const COLS = "1.4fr 100px 1.6fr 120px";

interface Row {
  id: string;
  display_name: string;
  account_type: string;
  created_at: string;
  owner: { full_name: string | null; email: string | null } | null;
}

export default async function AdminAccountsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select(
      "id, display_name, account_type, created_at, owner:profiles!owner_user_id(full_name, email)",
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Accounts"
        sub={`${rows.length} total`}
      />
      <div style={{ padding: "var(--s-8)" }}>
        <div className="card" style={{ overflowX: "auto" }}>
          <div
            className="row"
            style={{
              gridTemplateColumns: COLS,
              padding: "var(--s-3) var(--s-5)",
              background: "var(--bg)",
            }}
          >
            {["Name", "Type", "Owner", "Created"].map((h) => (
              <span key={h} className="t-meta">
                {h}
              </span>
            ))}
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-4) var(--s-5)",
              }}
            >
              <span className="t-body" style={{ color: "var(--fg)" }}>
                {r.display_name}
              </span>
              <span className="chip">{r.account_type}</span>
              <span className="t-body-2">
                {r.owner?.full_name ?? "—"}
                {r.owner?.email && (
                  <span
                    style={{ color: "var(--fg-3)", marginLeft: "var(--s-2)" }}
                  >
                    {r.owner.email}
                  </span>
                )}
              </span>
              <span className="t-meta">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
