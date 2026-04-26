import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

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
      "id, full_name, phone, email, role, account:accounts(display_name), created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  const { data } = await query;
  const rows = (data ?? []) as unknown as UserRow[];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Users</h1>
      <p className="label-mono mb-4">{rows.length} most-recent</p>

      <form action="/admin/users" method="get" className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name / phone / email…"
          className="input-dark max-w-md"
        />
        <select name="role" defaultValue={role} className="input-dark max-w-[160px]">
          <option value="">All roles</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="door_staff">Door staff</option>
          <option value="door_manager">Door manager</option>
          <option value="photographer">Photographer</option>
          <option value="guest">Guest</option>
        </select>
        <button type="submit" className="btn-ghost w-auto px-4">
          Search
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="label-mono text-left">
            <tr>
              <th className="pb-2">Name</th>
              <th>Role</th>
              <th>Account</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-2 text-cream">
                  {u.full_name ?? <span className="text-muted">—</span>}
                </td>
                <td className="py-2 label-mono">{u.role}</td>
                <td className="py-2 text-muted">
                  {u.account?.display_name ?? "—"}
                </td>
                <td className="py-2 font-mono text-xs">{u.phone ?? "—"}</td>
                <td className="py-2 text-muted text-xs">{u.email ?? "—"}</td>
                <td className="py-2 label-mono">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="label-mono mt-8">
        <Link href="/admin" className="hover:text-cream">
          ← Stats
        </Link>
      </p>
    </main>
  );
}
