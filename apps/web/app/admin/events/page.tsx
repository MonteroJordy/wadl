import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  created_at: string;
  account: { display_name: string } | null;
  venue: { name: string | null } | null;
  event_nights: Array<{ id: string }>;
}

export default async function AdminEventsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select(
      "id, name, created_at, account:accounts(display_name), venue:venues(name), event_nights(id)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="display-lg mb-2">Events</h1>
      <p className="label-mono mb-6">Most recent 200</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="label-mono text-left">
            <tr>
              <th className="pb-2">Name</th>
              <th>Account</th>
              <th>Venue</th>
              <th>Nights</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 text-cream">{r.name}</td>
                <td className="py-2">{r.account?.display_name}</td>
                <td className="py-2 label-mono">{r.venue?.name ?? "—"}</td>
                <td className="py-2">{r.event_nights.length}</td>
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
          ← Back
        </Link>
      </p>
    </main>
  );
}
