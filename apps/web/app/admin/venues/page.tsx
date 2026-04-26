import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface VenueRow {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  default_capacity: number | null;
  created_at: string;
  account: { display_name: string; account_type: string } | null;
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const admin = createAdminClient();

  let query = admin
    .from("venues")
    .select(
      "id, name, city, address, default_capacity, created_at, account:accounts(display_name, account_type)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as VenueRow[];

  // Pull events count per venue for the table.
  const ids = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: ev } = await admin
      .from("events")
      .select("venue_id")
      .in("venue_id", ids);
    for (const e of (ev ?? []) as Array<{ venue_id: string }>) {
      counts.set(e.venue_id, (counts.get(e.venue_id) ?? 0) + 1);
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Venues</h1>
      <p className="label-mono mb-4">{rows.length} most-recent</p>

      <form action="/admin/venues" method="get" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search venue name…"
          className="input-dark max-w-md"
        />
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="label-mono text-left">
            <tr>
              <th className="pb-2">Venue</th>
              <th>City</th>
              <th>Owner</th>
              <th>Cap</th>
              <th className="text-right">Events</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="py-2 text-cream truncate">{v.name}</td>
                <td className="py-2 label-mono">{v.city ?? "—"}</td>
                <td className="py-2 text-muted truncate">
                  {v.account?.display_name ?? "—"}
                </td>
                <td className="py-2 text-right">{v.default_capacity ?? "—"}</td>
                <td className="py-2 text-right">{counts.get(v.id) ?? 0}</td>
                <td className="py-2 label-mono text-muted">
                  {new Date(v.created_at).toLocaleDateString()}
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
