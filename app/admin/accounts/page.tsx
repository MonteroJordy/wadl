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
      "id, display_name, account_type, created_at, owner:profiles!owner_user_id(full_name, email)"
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="display-lg mb-2">Accounts</h1>
      <p className="label-mono mb-6">{rows.length} total</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="label-mono text-left">
            <tr>
              <th className="pb-2">Name</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 text-cream">{r.display_name}</td>
                <td className="py-2 label-mono">{r.account_type}</td>
                <td className="py-2 text-cream">
                  {r.owner?.full_name ?? "—"}
                  {r.owner?.email && (
                    <span className="text-muted text-xs ml-2">{r.owner.email}</span>
                  )}
                </td>
                <td className="py-2 label-mono">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="label-mono mt-8">
        <Link href="/admin" className="hover:text-cream">
          ← Back to stats
        </Link>
      </p>
    </main>
  );
}
