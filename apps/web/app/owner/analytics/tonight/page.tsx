import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeCounters from "@/components/realtime-counters";
import { Stat } from "@/components/v5";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tonight live — WADL" };

interface NightLite {
  id: string;
  doors_at: string;
  capacity_cap: number | null;
  event: { id: string; name: string; account_id: string };
}

interface ScanRow {
  scanned_at: string;
  state: string;
  guest: {
    full_name: string;
    tier: string;
    plus_ones: number;
    allocation: { holder_name: string } | null;
  } | null;
}

function fmtHourLabel(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase();
}

export default async function TonightLivePage() {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const now = Date.now();
  const lo = new Date(now - 8 * 60 * 60_000).toISOString();
  const hi = new Date(now + 18 * 60 * 60_000).toISOString();
  const { data: nightsRaw } = await admin
    .from("event_nights")
    .select(
      "id, doors_at, capacity_cap, event:events!inner(id, name, account_id)",
    )
    .gte("doors_at", lo)
    .lte("doors_at", hi);
  const nights = ((nightsRaw ?? []) as unknown as NightLite[]).filter(
    (n) => n.event.account_id === account.id,
  );

  if (nights.length === 0) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
      >
        <div className="t-display-sm">Quiet tonight</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          No doors within an 8h-ago to 18h-ahead window. Live counters, hour
          velocity, real-time tier mix — they&apos;ll all be here when a night
          opens.
        </p>
      </div>
    );
  }

  const active = [...nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1,
  )[0];

  const [guestsRes, scansRes] = await Promise.all([
    admin
      .from("guests")
      .select("status, plus_ones, tier, allocation:allocations(holder_name)")
      .eq("event_night_id", active.id),
    admin
      .from("check_ins")
      .select(
        "scanned_at, state, guest:guests!inner(full_name, tier, plus_ones, allocation:allocations(holder_name))",
      )
      .eq("event_night_id", active.id)
      .order("scanned_at", { ascending: false })
      .limit(50),
  ]);

  const guests = (guestsRes.data ?? []) as unknown as Array<{
    status: string;
    plus_ones: number;
    tier: string;
    allocation: { holder_name: string } | null;
  }>;

  let approved = 0;
  let pending = 0;
  const tierCounts = {
    ga: { rsvp: 0, in: 0 },
    vip: { rsvp: 0, in: 0 },
    all_access: { rsvp: 0, in: 0 },
  };
  const promoters = new Map<
    string,
    { submitted: number; approved: number; in: number; pending: number }
  >();
  for (const g of guests) {
    const heads = 1 + (g.plus_ones ?? 0);
    if (g.status === "approved") approved += heads;
    else if (g.status === "pending") pending += heads;
    const tk =
      g.tier in tierCounts ? (g.tier as keyof typeof tierCounts) : "ga";
    if (g.status === "approved") tierCounts[tk].rsvp += heads;
    const holder = g.allocation?.holder_name ?? "Walk-up";
    if (!promoters.has(holder))
      promoters.set(holder, {
        submitted: 0,
        approved: 0,
        in: 0,
        pending: 0,
      });
    const p = promoters.get(holder)!;
    p.submitted += heads;
    if (g.status === "approved") p.approved += heads;
    if (g.status === "pending") p.pending += heads;
  }

  const scans = (scansRes.data ?? []) as unknown as ScanRow[];
  let scannedTotal = 0;
  const hourCounts = new Map<number, number>();
  for (const s of scans) {
    if (s.state !== "approved") continue;
    scannedTotal += 1;
    const h = new Date(s.scanned_at).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    const tk = s.guest?.tier as keyof typeof tierCounts | undefined;
    if (tk && tk in tierCounts) tierCounts[tk].in += 1;
    const holder = s.guest?.allocation?.holder_name ?? "Walk-up";
    const p = promoters.get(holder);
    if (p) p.in += 1;
  }

  const cap = active.capacity_cap ?? 0;
  const pctFull = cap > 0 ? Math.round((scannedTotal / cap) * 100) : 0;
  const showRate = approved > 0 ? Math.round((scannedTotal / approved) * 100) : 0;

  const startHour = new Date(active.doors_at).getHours();
  const nowHour = new Date().getHours();
  const hours: Array<{ hour: number; count: number }> = [];
  for (let h = startHour; h !== (nowHour + 1) % 24; h = (h + 1) % 24) {
    hours.push({ hour: h, count: hourCounts.get(h) ?? 0 });
    if (hours.length > 12) break;
  }
  const peakBucket = Math.max(1, ...hours.map((h) => h.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--s-4)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            className="t-meta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-1)",
              color: "var(--ok)",
            }}
          >
            <span
              className="dot dot--ok pulse"
              style={{ display: "inline-block" }}
            />
            Live
          </div>
          <div className="t-display-sm" style={{ marginTop: "var(--s-2)" }}>
            {active.event.name}
          </div>
          <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
            Doors {fmtTime(active.doors_at)}
          </div>
        </div>
        <RealtimeCounters nightId={active.id} />
      </header>

      {/* KPI strip — show rate gets primary prominence */}
      <div
        className="card"
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        <Stat
          label="Show rate"
          value={`${showRate}%`}
          sub={`${scannedTotal} in of ${approved} approved`}
        />
        <Stat
          label="Scanned in"
          value={scannedTotal}
          sub={cap ? `of ${cap} cap` : "no cap set"}
        />
        <Stat label="Pending" value={pending} sub="awaiting approval" />
        <Stat
          label="Capacity"
          value={`${pctFull}%`}
          sub="of the room filled"
          last
        />
      </div>

      {cap > 0 && (
        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div
            className="t-meta"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--s-2)",
            }}
          >
            <span>Door fill</span>
            <span className="t-num">
              {scannedTotal} / {cap}
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--bg-3)",
              borderRadius: "var(--r-pill)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, pctFull)}%`,
                height: "100%",
                background: "var(--fg)",
              }}
            />
          </div>
        </div>
      )}

      {/* Velocity + Tier mix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
            Velocity by hour · tonight
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--s-1)",
              height: 96,
            }}
          >
            {hours.map((h) => {
              const isPeak = h.count === peakBucket && h.count > 0;
              return (
                <div
                  key={h.hour}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "var(--s-1)",
                    minWidth: 12,
                  }}
                  title={`${fmtHourLabel(h.hour)}: ${h.count}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(h.count / peakBucket) * 100}%`,
                      background: isPeak ? "var(--fg)" : "var(--fg-4)",
                    }}
                  />
                  <div className="t-meta" style={{ fontSize: 9 }}>
                    {fmtHourLabel(h.hour).replace(":00", "").toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: "var(--s-4)",
              gap: "var(--s-3)",
            }}
          >
            <div className="t-meta">Tier split tonight</div>
            <div style={{ display: "flex", gap: "var(--s-1)" }}>
              <span className="chip">GA</span>
              <span className="chip">VIP</span>
              <span className="chip">AAA</span>
            </div>
          </div>
          {(["ga", "vip", "all_access"] as const).map((t) => {
            const tierLabel = t === "all_access" ? "AAA" : t.toUpperCase();
            const pct =
              tierCounts[t].rsvp === 0
                ? 0
                : (tierCounts[t].in / tierCounts[t].rsvp) * 100;
            return (
              <div key={t} style={{ marginBottom: "var(--s-3)" }}>
                <div
                  className="t-meta"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "var(--s-1)",
                  }}
                >
                  <span>{tierLabel}</span>
                  <span>
                    <span style={{ color: "var(--ok)" }}>
                      {tierCounts[t].in}
                    </span>{" "}
                    in / {tierCounts[t].rsvp} rsvp
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--bg-3)",
                    borderRadius: "var(--r-pill)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "var(--fg)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Promoter perf */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Promoter performance · tonight
        </div>
        <div
          style={{
            overflowX: "auto",
            margin: "0 calc(-1 * var(--s-6))",
            padding: "0 var(--s-6)",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: "var(--ts-md)",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  ["Holder", "left"],
                  ["Submitted", "right"],
                  ["Approved", "right"],
                  ["In", "right"],
                  ["Show", "right"],
                  ["Pending", "right"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    className="t-meta"
                    style={{
                      textAlign: align as "left" | "right",
                      paddingBottom: "var(--s-2)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...promoters.entries()]
                .sort((a, b) => b[1].in - a[1].in)
                .map(([name, v]) => {
                  const show =
                    v.approved === 0
                      ? 0
                      : Math.round((v.in / v.approved) * 100);
                  return (
                    <tr
                      key={name}
                      style={{ borderTop: "1px solid var(--line)" }}
                    >
                      <td
                        className="t-body truncate"
                        style={{ padding: "var(--s-3) 0", maxWidth: 240 }}
                      >
                        {name}
                      </td>
                      <td
                        className="t-body t-num"
                        style={{
                          padding: "var(--s-3) 0",
                          textAlign: "right",
                        }}
                      >
                        {v.submitted}
                      </td>
                      <td
                        className="t-body t-num"
                        style={{
                          padding: "var(--s-3) 0",
                          textAlign: "right",
                        }}
                      >
                        {v.approved}
                      </td>
                      <td
                        className="t-body t-num"
                        style={{
                          padding: "var(--s-3) 0",
                          textAlign: "right",
                          color: "var(--ok)",
                        }}
                      >
                        {v.in}
                      </td>
                      <td
                        className="t-body t-num"
                        style={{
                          padding: "var(--s-3) 0",
                          textAlign: "right",
                        }}
                      >
                        {show}%
                      </td>
                      <td
                        className="t-body t-num"
                        style={{
                          padding: "var(--s-3) 0",
                          textAlign: "right",
                          color:
                            v.pending > 0 ? "var(--warn)" : "var(--fg-3)",
                        }}
                      >
                        {v.pending}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live feed */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Live check-in feed
        </div>
        {scans.length === 0 ? (
          <p className="t-body-2">No scans yet tonight.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {scans.slice(0, 25).map((s, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-3)",
                  padding: "var(--s-2) 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                }}
              >
                <span className="t-meta" style={{ flexShrink: 0 }}>
                  {new Date(s.scanned_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="t-body truncate" style={{ flex: 1 }}>
                  {s.guest?.full_name ?? "—"}
                </span>
                <span className="chip">
                  {(s.guest?.tier ?? "—").toUpperCase()}
                </span>
                <span
                  className="t-meta truncate"
                  style={{ maxWidth: 160 }}
                >
                  {s.guest?.allocation?.holder_name ?? "Walk-up"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href={`/owner/events/${active.event.id}`}
        className="btn btn--ghost btn--block"
      >
        Open event daydash →
      </Link>
    </div>
  );
}
