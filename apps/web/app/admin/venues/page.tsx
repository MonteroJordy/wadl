import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";

const COLS = "1.6fr 1fr 1.4fr 80px 90px 120px";

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
      "id, name, city, address, default_capacity, created_at, account:accounts(display_name, account_type)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as VenueRow[];

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
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Venues"
        sub={`${rows.length} most-recent`}
      />
      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <form action="/admin/venues" method="get">
          <input
            className="input"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search venue name…"
            style={{ maxWidth: 420 }}
          />
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
            {["Venue", "City", "Owner", "Cap", "Events", "Created"].map((h) => (
              <span key={h} className="t-meta">
                {h}
              </span>
            ))}
          </div>
          {rows.map((v) => (
            <div
              key={v.id}
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-4) var(--s-5)",
              }}
            >
              <span className="t-body truncate" style={{ color: "var(--fg)" }}>
                {v.name}
              </span>
              <span className="t-body-2">{v.city ?? "—"}</span>
              <span className="t-body-2 truncate">
                {v.account?.display_name ?? "—"}
              </span>
              <span className="t-body-2 t-num">
                {v.default_capacity ?? "—"}
              </span>
              <span className="t-body-2 t-num">{counts.get(v.id) ?? 0}</span>
              <span className="t-meta">
                {new Date(v.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
