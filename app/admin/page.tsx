import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const admin = createAdminClient();

  const [accounts, profiles, events, nights, guests, scans, broadcasts, flags] =
    await Promise.all([
      admin.from("accounts").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("events").select("id", { count: "exact", head: true }),
      admin.from("event_nights").select("id", { count: "exact", head: true }),
      admin.from("guests").select("id", { count: "exact", head: true }),
      admin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("state", "approved"),
      admin.from("broadcasts").select("id", { count: "exact", head: true }),
      admin
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("flag_dna", true),
    ]);

  const stats: Array<[string, number]> = [
    ["Accounts", accounts.count ?? 0],
    ["Users", profiles.count ?? 0],
    ["Events", events.count ?? 0],
    ["Nights", nights.count ?? 0],
    ["Guests", guests.count ?? 0],
    ["Scans (approved)", scans.count ?? 0],
    ["Broadcasts", broadcasts.count ?? 0],
    ["DNA flagged", flags.count ?? 0],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 pt-8 pb-12">
      <h1 className="display-lg mb-2">Platform stats</h1>
      <p className="label-mono mb-6">Real numbers across all accounts.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="card">
            <p className="label-mono mb-1">{label}</p>
            <p className="font-display text-4xl text-cream">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
