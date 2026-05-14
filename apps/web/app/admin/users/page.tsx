import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";

const COLS = "1.4fr 110px 1.2fr 130px 1.4fr 110px";

interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  account: { display_name: string } | null;
  created_at: string;
}


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
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Users"
        sub={`${rows.length} most-recent`}
      />
      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <form
          action="/admin/users"
          method="get"
          style={{
            display: "flex",
            gap: "var(--s-2)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            className="input"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name / phone / email…"
            style={{ maxWidth: 380 }}
          />
          <select
            className="input"
            name="role"
            defaultValue={role}
            style={{ maxWidth: 180 }}
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
          <button className="btn btn--ghost" type="submit">
            Search
          </button>
        </form>
      </div>

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
            {["Name", "Role", "Account", "Phone", "Email", "Joined"].map(
              (h) => (
                <span key={h} className="t-meta">
                  {h}
                </span>
              ),
            )}
          </div>
          {rows.map((u) => (
            <div
              key={u.id}
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-4) var(--s-5)",
              }}
            >
              <span className="t-body" style={{ color: "var(--fg)" }}>
                {u.full_name ?? "—"}
              </span>
              <span className="chip">{u.role}</span>
              <span className="t-body-2">{u.account?.display_name ?? "—"}</span>
              <span
                className="t-body-2"
                style={{ fontFamily: "var(--mono)", fontSize: "var(--ts-sm)" }}
              >
                {u.phone ?? "—"}
              </span>
              <span className="t-body-2 truncate">{u.email ?? "—"}</span>
              <span className="t-meta">
                {new Date(u.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
