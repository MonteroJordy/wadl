import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/wadl";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  account: { display_name: string } | null;
  created_at: string;
}

const INPUT_STYLE = {
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const role = searchParams.role ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select(
      "id, full_name, phone, email, role, account:accounts(display_name), created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q)
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
    );
  if (role) query = query.eq("role", role);
  const { data } = await query;
  const rows = (data ?? []) as unknown as UserRow[];

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
            Users
          </div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {rows.length} MOST-RECENT
          </p>
        </div>

        <form
          action="/admin/users"
          method="get"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name / phone / email…"
            style={{ ...INPUT_STYLE, width: "100%", maxWidth: 380 }}
          />
          <select
            name="role"
            defaultValue={role}
            style={{ ...INPUT_STYLE, maxWidth: 180 }}
          >
            <option value="">All roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="door_staff">Door staff</option>
            <option value="door_manager">Door manager</option>
            <option value="photographer">Photographer</option>
            <option value="guest">Guest</option>
          </select>
          <Button variant="ghost" type="submit" style={{ padding: "0 18px" }}>
            Search
          </Button>
        </form>

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
                  "NAME",
                  "ROLE",
                  "ACCOUNT",
                  "PHONE",
                  "EMAIL",
                  "JOINED",
                ].map((h) => (
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
              {rows.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td style={{ padding: "10px 0", color: "var(--w-fg)" }}>
                    {u.full_name ?? (
                      <span style={{ color: "var(--w-fg-muted)" }}>—</span>
                    )}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {u.role.toUpperCase()}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-muted)",
                    }}
                  >
                    {u.account?.display_name ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      fontFamily: "var(--w-mono)",
                      fontSize: 12,
                    }}
                  >
                    {u.phone ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-muted)",
                      fontSize: 12,
                    }}
                  >
                    {u.email ?? "—"}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {new Date(u.created_at)
                      .toLocaleDateString()
                      .toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="w-type-meta" style={{ marginTop: 24 }}>
          <Link
            href="/admin"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            ← STATS
          </Link>
        </p>
      </div>
    </main>
  );
}
