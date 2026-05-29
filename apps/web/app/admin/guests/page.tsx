import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";
import ForceFlagButton from "./force-flag-button";

export const dynamic = "force-dynamic";

const COLS = "1.4fr 140px 110px 1.4fr 1.2fr 110px";

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
      "id, full_name, phone, flag_dna, status, created_at, night:event_nights!inner(night_date, event:events!inner(name, account:accounts!inner(display_name)))",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main id="main-content">
      <PageHeader eyebrow="Platform" title="Guests" />
      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <form action="/admin/guests" method="get">
          <input
            className="input"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
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
            {["Name", "Phone", "Status", "Event", "Account", "DNA"].map((h) => (
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
                {r.full_name}
              </span>
              <span
                className="t-body-2"
                style={{ fontFamily: "var(--mono)", fontSize: "var(--ts-sm)" }}
              >
                {r.phone ?? "—"}
              </span>
              <span className="chip">{r.status}</span>
              <span className="t-body-2 truncate">{r.night.event.name}</span>
              <span className="t-body-2 truncate">
                {r.night.event.account.display_name}
              </span>
              <span>
                <ForceFlagButton guestId={r.id} alreadyFlagged={r.flag_dna} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
