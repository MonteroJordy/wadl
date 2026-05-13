import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
            Accounts
          </div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {rows.length} TOTAL
          </p>
        </div>

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
                {["NAME", "TYPE", "OWNER", "CREATED"].map((h) => (
                  <th
                    key={h}
                    className="w-type-meta"
                    style={{ textAlign: "left", paddingBottom: 8 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td style={{ padding: "10px 0", color: "var(--w-fg)" }}>
                    {r.display_name}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {r.account_type.toUpperCase()}
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--w-fg)" }}>
                    {r.owner?.full_name ?? "—"}
                    {r.owner?.email && (
                      <span
                        style={{
                          color: "var(--w-fg-muted)",
                          fontSize: 12,
                          marginLeft: 8,
                        }}
                      >
                        {r.owner.email}
                      </span>
                    )}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {new Date(r.created_at)
                      .toLocaleDateString()
                      .toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p
          className="w-type-meta"
          style={{ marginTop: 24 }}
        >
          <Link
            href="/admin"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            ← BACK TO STATS
          </Link>
        </p>
      </div>
    </main>
  );
}
