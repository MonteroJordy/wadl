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
    <main id="main-content" style={{ padding: "32px 24px 96px" }}>
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
            Venues
          </div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {rows.length} MOST-RECENT
          </p>
        </div>

        <form
          action="/admin/venues"
          method="get"
          style={{ marginBottom: 16 }}
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search venue name…"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--w-surface-1)",
              border: "1px solid var(--w-line)",
              color: "var(--w-fg)",
              padding: "10px 12px",
              fontFamily: "var(--w-sans)",
              fontSize: 14,
            }}
          />
        </form>

        <section
          className="w-card"
          style={{ padding: 20, overflowX: "auto" }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 14,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  ["VENUE", "left"],
                  ["CITY", "left"],
                  ["OWNER", "left"],
                  ["CAP", "right"],
                  ["EVENTS", "right"],
                  ["CREATED", "left"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    className="w-type-meta"
                    style={{
                      textAlign: align as "left" | "right",
                      paddingBottom: 8,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.id}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 240,
                    }}
                  >
                    {v.name}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {(v.city ?? "—").toUpperCase()}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 220,
                    }}
                  >
                    {v.account?.display_name ?? "—"}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {v.default_capacity ?? "—"}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {counts.get(v.id) ?? 0}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-muted)",
                    }}
                  >
                    {new Date(v.created_at)
                      .toLocaleDateString()
                      .toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="w-type-meta" style={{ marginTop: 24 }}>
          <Link
            href="/admin"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            ← STATS
          </Link>
        </p>
      </div>
    </main>
  );
}
