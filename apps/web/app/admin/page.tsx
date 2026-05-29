import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

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
    ["ACCOUNTS", accounts.count ?? 0],
    ["USERS", profiles.count ?? 0],
    ["EVENTS", events.count ?? 0],
    ["NIGHTS", nights.count ?? 0],
    ["GUESTS", guests.count ?? 0],
    ["SCANS (APPROVED)", scans.count ?? 0],
    ["BROADCASTS", broadcasts.count ?? 0],
    ["DNA FLAGGED", flags.count ?? 0],
  ];

  return (
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Platform stats"
        sub="Real numbers across all accounts."
      />
      <div style={{ padding: "var(--s-8)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {stats.map(([label, value]) => (
            <div key={label} className="card" style={{ padding: "var(--s-5)" }}>
              <div className="t-meta">{label}</div>
              <div
                className="t-display-md t-num"
                style={{ marginTop: "var(--s-2)" }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
