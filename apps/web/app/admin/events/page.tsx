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
      "id, name, created_at, account:accounts(display_name), venue:venues(name), event_nights(id)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

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
            Events
          </div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            MOST RECENT 200
          </p>
        </div>
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
                {["NAME", "ACCOUNT", "VENUE", "NIGHTS", "CREATED"].map((h) => (
                  <th
                    key={h}
                    className="w-type-meta"
                    style={{ textAlign: "left", paddingBottom: 8 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td style={{ padding: "10px 0", color: "var(--w-fg)" }}>
                    {r.name}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    {r.account?.display_name}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {(r.venue?.name ?? "—").toUpperCase()}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    {r.event_nights.length}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {new Date(r.created_at)
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
            ← BACK
          </Link>
        </p>
      </div>
    </main>
  );
}
