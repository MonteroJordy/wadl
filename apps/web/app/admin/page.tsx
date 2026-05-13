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
    <main
      id="main-content"
      style={{ padding: "32px 24px 96px" }}
    >
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
            Platform stats
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Real numbers across all accounts.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {stats.map(([label, value]) => (
            <div key={label} className="w-card" style={{ padding: 18 }}>
              <div className="w-type-meta">{label}</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 36,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                  marginTop: 8,
                  color: "var(--w-fg)",
                }}
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
