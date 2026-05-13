import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface LiveNight {
  id: string;
  doors_at: string;
  capacity_cap: number | null;
  event: {
    id: string;
    name: string;
    account: {
      display_name: string;
      venues: { city: string | null }[] | null;
    } | null;
  };
}

export default async function AdminOperationsPage() {
  const admin = createAdminClient();
  const now = Date.now();
  const lo = new Date(now - 6 * 60 * 60_000).toISOString();
  const hi = new Date(now + 12 * 60 * 60_000).toISOString();

  const [live, scansLast24h, broadcasts7d, ticketsOpen] = await Promise.all([
    admin
      .from("event_nights")
      .select(
        "id, doors_at, capacity_cap, event:events!inner(id, name, account:accounts!inner(display_name, venues(city)))",
      )
      .gte("doors_at", lo)
      .lte("doors_at", hi),
    admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("state", "approved")
      .gte("scanned_at", new Date(now - 24 * 60 * 60_000).toISOString()),
    admin
      .from("broadcasts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - 7 * 24 * 60 * 60_000).toISOString()),
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "pending"]),
  ]);

  const liveRows = (live.data ?? []) as unknown as LiveNight[];

  const nightIds = liveRows.map((r) => r.id);
  const liveStats = new Map<
    string,
    { in: number; pending: number; rsvp: number }
  >();
  if (nightIds.length > 0) {
    const [scansRes, guestsRes] = await Promise.all([
      admin
        .from("check_ins")
        .select("event_night_id, state")
        .in("event_night_id", nightIds),
      admin
        .from("guests")
        .select("event_night_id, status, plus_ones")
        .in("event_night_id", nightIds),
    ]);
    for (const id of nightIds)
      liveStats.set(id, { in: 0, pending: 0, rsvp: 0 });
    for (const s of (scansRes.data ?? []) as Array<{
      event_night_id: string;
      state: string;
    }>) {
      if (s.state === "approved") liveStats.get(s.event_night_id)!.in += 1;
    }
    for (const g of (guestsRes.data ?? []) as Array<{
      event_night_id: string;
      status: string;
      plus_ones: number;
    }>) {
      const heads = 1 + (g.plus_ones ?? 0);
      const slot = liveStats.get(g.event_night_id)!;
      if (g.status === "approved") slot.rsvp += heads;
      else if (g.status === "pending") slot.pending += heads;
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
            Operations
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Platform-wide health + live state.
          </p>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <KPI label="SYSTEM HEALTH" value="OK" tone="ok" border="ok" />
          <KPI label="LIVE EVENTS" value={liveRows.length} />
          <KPI label="CHECK-INS / 24H" value={scansLast24h.count ?? 0} />
          <KPI label="BROADCASTS / 7D" value={broadcasts7d.count ?? 0} />
        </section>

        <section
          className="w-card"
          style={{
            padding: 18,
            marginBottom: 16,
            borderColor: "var(--w-err)",
          }}
        >
          <div className="w-type-meta">OPEN SUPPORT</div>
          <div
            style={{
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              marginTop: 8,
              color: "var(--w-err)",
            }}
          >
            {ticketsOpen.count ?? 0}
          </div>
          <Link
            href="/admin/support"
            className="w-type-meta"
            style={{
              display: "block",
              marginTop: 10,
              color: "var(--w-acc)",
              textDecoration: "none",
            }}
          >
            OPEN QUEUE →
          </Link>
        </section>

        <section>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            TONIGHT LIVE ACROSS THE PLATFORM
          </div>
          {liveRows.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              Nothing live right now.
            </p>
          ) : (
            <div
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
                      ["EVENT", "left"],
                      ["ACCOUNT", "left"],
                      ["CITY", "left"],
                      ["RSVPS", "right"],
                      ["IN", "right"],
                      ["PENDING", "right"],
                      ["CAP", "right"],
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
                  {liveRows.map((r) => {
                    const s =
                      liveStats.get(r.id) ?? { in: 0, pending: 0, rsvp: 0 };
                    return (
                      <tr
                        key={r.id}
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
                          {r.event.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            color: "var(--w-fg-muted)",
                          }}
                        >
                          {r.event.account?.display_name ?? "—"}
                        </td>
                        <td
                          className="w-type-meta"
                          style={{ padding: "10px 0" }}
                        >
                          {(
                            r.event.account?.venues?.[0]?.city ?? "—"
                          ).toUpperCase()}
                        </td>
                        <td
                          style={{ padding: "10px 0", textAlign: "right" }}
                        >
                          {s.rsvp}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            textAlign: "right",
                            color: "var(--w-ok)",
                          }}
                        >
                          {s.in}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            textAlign: "right",
                            color: "var(--w-warn)",
                          }}
                        >
                          {s.pending}
                        </td>
                        <td
                          style={{ padding: "10px 0", textAlign: "right" }}
                        >
                          {r.capacity_cap ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KPI({
  label,
  value,
  tone,
  border,
}: {
  label: string;
  value: string | number;
  tone?: "ok";
  border?: "ok";
}) {
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: border === "ok" ? "var(--w-ok)" : "var(--w-line)",
      }}
    >
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 8,
          color: tone === "ok" ? "var(--w-ok)" : "var(--w-fg)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
