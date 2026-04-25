import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  full_name: string;
  phone: string | null;
  flag_dna: boolean;
  status: string;
  created_at: string;
  night: {
    night_date: string;
    event: { name: string; account: { display_name: string } };
  };
}

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const admin = createAdminClient();
  let query = admin
    .from("guests")
    .select(
      "id, full_name, phone, flag_dna, status, created_at, night:event_nights!inner(night_date, event:events!inner(name, account:accounts!inner(display_name)))"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="display-lg mb-2">Guests</h1>
      <form action="/admin/guests" method="get" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="input-dark max-w-md"
        />
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="label-mono text-left">
            <tr>
              <th className="pb-2">Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Event</th>
              <th>Account</th>
              <th>DNA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2 text-cream">{r.full_name}</td>
                <td className="py-2 font-mono text-xs">{r.phone ?? "—"}</td>
                <td className="py-2 label-mono">{r.status}</td>
                <td className="py-2">{r.night.event.name}</td>
                <td className="py-2 text-muted text-xs">
                  {r.night.event.account.display_name}
                </td>
                <td className="py-2">
                  {r.flag_dna ? <span className="text-coral">⚠</span> : ""}
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
