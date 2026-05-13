import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import RealtimeCounters from "@/components/realtime-counters";
import { Button, CapacityMeter, Chip, CredPill } from "@/components/wadl";
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
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">Quiet tonight</div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 480,
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          No doors within an 8h-ago to 18h-ahead window. Live counters,
          hour velocity, real-time tier mix — they&apos;ll all be here when
          a night opens.
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

  const startHour = new Date(active.doors_at).getHours();
  const nowHour = new Date().getHours();
  const hours: Array<{ hour: number; count: number }> = [];
  for (let h = startHour; h !== (nowHour + 1) % 24; h = (h + 1) % 24) {
    hours.push({ hour: h, count: hourCounts.get(h) ?? 0 });
    if (hours.length > 12) break;
  }
  const peakBucket = Math.max(1, ...hours.map((h) => h.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            className="w-type-meta"
            style={{
              color: "var(--w-acc)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="w-pulse"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                background: "currentColor",
              }}
            />
            LIVE
          </div>
          <div className="w-type-display-md" style={{ marginTop: 6 }}>
            {active.event.name}
          </div>
          <div className="w-type-meta" style={{ marginTop: 6 }}>
            DOORS {fmtTime(active.doors_at).toUpperCase()}
          </div>
        </div>
        <RealtimeCounters nightId={active.id} />
      </header>

      {/* KPI strip */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <KPI label="SCANNED IN" value={scannedTotal} sub={cap ? `/ ${cap}` : ""} />
        <KPI label="APPROVED" value={approved} tone="ok" />
        <KPI label="PENDING" value={pending} tone="warn" />
        <KPI label="CAPACITY" value={`${pctFull}%`} accent />
      </section>

      {cap > 0 && (
        <section className="w-card" style={{ padding: 18 }}>
          <CapacityMeter
            current={scannedTotal}
            total={cap}
            accent
            label="DOOR FILL"
          />
        </section>
      )}

      {/* Velocity + Tier mix */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <div className="w-card" style={{ padding: 20 }}>
          <div className="w-type-meta" style={{ marginBottom: 14 }}>
            VELOCITY BY HOUR · TONIGHT
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
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
                    gap: 4,
                    minWidth: 12,
                  }}
                  title={`${fmtHourLabel(h.hour)}: ${h.count}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(h.count / peakBucket) * 100}%`,
                      background: isPeak
                        ? "var(--w-acc)"
                        : "oklch(0.86 0.18 145 / 0.6)",
                    }}
                  />
                  <div
                    className="w-type-meta"
                    style={{ fontSize: 9 }}
                  >
                    {fmtHourLabel(h.hour).replace(":00", "").toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-card" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
              gap: 12,
            }}
          >
            <div className="w-type-meta">TIER SPLIT TONIGHT</div>
            <div style={{ display: "flex", gap: 6 }}>
              <CredPill tier="GA" />
              <CredPill tier="VIP" />
              <CredPill tier="AAA" />
            </div>
          </div>
          {(["ga", "vip", "all_access"] as const).map((t) => {
            const tierLabel =
              t === "all_access" ? "AAA" : t.toUpperCase();
            const pct =
              tierCounts[t].rsvp === 0
                ? 0
                : (tierCounts[t].in / tierCounts[t].rsvp) * 100;
            return (
              <div key={t} style={{ marginBottom: 12 }}>
                <div
                  className="w-type-meta"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span>{tierLabel}</span>
                  <span>
                    <span style={{ color: "var(--w-ok)" }}>
                      {tierCounts[t].in}
                    </span>{" "}
                    IN / {tierCounts[t].rsvp} RSVP
                  </span>
                </div>
                <div
                  className="w-meter w-meter--acc"
                  style={{ height: 6 }}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promoter perf */}
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          PROMOTER PERFORMANCE · TONIGHT
        </div>
        <div
          style={{ overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}
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
                  ["HOLDER", "left"],
                  ["SUBMITTED", "right"],
                  ["APPROVED", "right"],
                  ["IN", "right"],
                  ["SHOW", "right"],
                  ["PENDING", "right"],
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
                      style={{ borderTop: "1px solid var(--w-line)" }}
                    >
                      <td
                        style={{
                          padding: "10px 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 240,
                        }}
                      >
                        {name}
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right" }}>
                        {v.submitted}
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right" }}>
                        {v.approved}
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          color: "var(--w-ok)",
                        }}
                      >
                        {v.in}
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          fontFamily: "var(--w-mono)",
                        }}
                      >
                        {show}%
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          color:
                            v.pending > 0
                              ? "var(--w-warn)"
                              : "var(--w-fg-muted)",
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
      </section>

      {/* Live feed */}
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          LIVE CHECK-IN FEED
        </div>
        {scans.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            No scans yet tonight.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {scans.slice(0, 25).map((s, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--w-line)",
                  fontSize: 14,
                }}
              >
                <span
                  className="w-type-meta"
                  style={{ flexShrink: 0 }}
                >
                  {new Date(s.scanned_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.guest?.full_name ?? "—"}
                </span>
                <Chip tone="ghost">
                  {(s.guest?.tier ?? "—").toUpperCase()}
                </Chip>
                <span
                  className="w-type-meta"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {(s.guest?.allocation?.holder_name ?? "Walk-up").toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/owner/events/${active.event.id}`}
        style={{ textDecoration: "none" }}
      >
        <Button variant="ghost" block>
          Open event daydash →
        </Button>
      </Link>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "ok" | "warn";
  accent?: boolean;
}) {
  const valueColor =
    tone === "ok"
      ? "var(--w-ok)"
      : tone === "warn"
        ? "var(--w-warn)"
        : "var(--w-fg)";
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 8,
          color: valueColor,
        }}
      >
        {value}
        {sub && (
          <span
            style={{
              color: "var(--w-fg-dim)",
              fontSize: 18,
              marginLeft: 4,
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
