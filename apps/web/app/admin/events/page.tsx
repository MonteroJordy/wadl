import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";

const COLS = "1.6fr 1.2fr 1fr 80px 120px";

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
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Events"
        sub="Most recent 200"
      />
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
            {["Name", "Account", "Venue", "Nights", "Created"].map((h) => (
              <span key={h} className="t-meta">
                {h}
              </span>
            ))}
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-4) var(--s-5)",
              }}
            >
              <span className="t-body" style={{ color: "var(--fg)" }}>
                {r.name}
              </span>
              <span className="t-body-2">{r.account?.display_name}</span>
              <span className="t-body-2">{r.venue?.name ?? "—"}</span>
              <span className="t-body-2 t-num">{r.event_nights.length}</span>
              <span className="t-meta">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
