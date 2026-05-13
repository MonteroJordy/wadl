import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import ForceFlagButton from "./force-flag-button";

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
      "id, full_name, phone, flag_dna, status, created_at, night:event_nights!inner(night_date, event:events!inner(name, account:accounts!inner(display_name)))",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data } = await query;
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
            Guests
          </div>
        </div>

        <form
          action="/admin/guests"
          method="get"
          style={{ marginBottom: 16 }}
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
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
                {["NAME", "PHONE", "STATUS", "EVENT", "ACCOUNT", "DNA"].map(
                  (h) => (
                    <th
                      key={h}
                      className="w-type-meta"
                      style={{ textAlign: "left", paddingBottom: 8 }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td style={{ padding: "10px 0", color: "var(--w-fg)" }}>
                    {r.full_name}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      fontFamily: "var(--w-mono)",
                      fontSize: 12,
                    }}
                  >
                    {r.phone ?? "—"}
                  </td>
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {r.status.toUpperCase()}
                  </td>
                  <td style={{ padding: "10px 0" }}>{r.night.event.name}</td>
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-muted)",
                      fontSize: 12,
                    }}
                  >
                    {r.night.event.account.display_name}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <ForceFlagButton
                      guestId={r.id}
                      alreadyFlagged={r.flag_dna}
                    />
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
