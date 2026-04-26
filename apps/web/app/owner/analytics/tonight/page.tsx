import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";
import RealtimeCounters from "@/components/realtime-counters";
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

  // Find the night that is "tonight" — within 6h before doors to 8h after.
  const now = Date.now();
  const lo = new Date(now - 8 * 60 * 60_000).toISOString();
  const hi = new Date(now + 18 * 60 * 60_000).toISOString();
  const { data: nightsRaw } = await admin
    .from("event_nights")
    .select(
      "id, doors_at, capacity_cap, event:events!inner(id, name, account_id)"
    )
    .gte("doors_at", lo)
    .lte("doors_at", hi);
  const nights = ((nightsRaw ?? []) as unknown as NightLite[]).filter(
    (n) => n.event.account_id === account.id
  );
  if (nights.length === 0) {
    return (
      <EmptyState
        title="Quiet tonight"
        body="No doors within an 8h-ago to 18h-ahead window. Live counters, hour velocity, real-time tier mix — they'll all be here when a night opens."
      />
    );
  }

  // Pick the soonest one.
  const active = [...nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  )[0];

  const [guestsRes, scansRes] = await Promise.all([
    admin
      .from("guests")
      .select("status, plus_ones, tier, allocation:allocations(holder_name)")
      .eq("event_night_id", active.id),
    admin
      .from("check_ins")
      .select(
        "scanned_at, state, guest:guests!inner(full_name, tier, plus_ones, allocation:allocations(holder_name))"
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
  const tierCounts = { ga: { rsvp: 0, in: 0 }, vip: { rsvp: 0, in: 0 }, all_access: { rsvp: 0, in: 0 } };
  const promoters = new Map<
    string,
    { submitted: number; approved: number; in: number; pending: number }
  >();
  for (const g of guests) {
    const heads = 1 + (g.plus_ones ?? 0);
    if (g.status === "approved") approved += heads;
    else if (g.status === "pending") pending += heads;
    const tk = g.tier in tierCounts ? (g.tier as keyof typeof tierCounts) : "ga";
    if (g.status === "approved") tierCounts[tk].rsvp += heads;
    const holder = g.allocation?.holder_name ?? "Walk-up";
    if (!promoters.has(holder))
      promoters.set(holder, { submitted: 0, approved: 0, in: 0, pending: 0 });
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

  // Build hour buckets, doors_at-1h to now.
  const startHour = new Date(active.doors_at).getHours();
  const nowHour = new Date().getHours();
  const hours: Array<{ hour: number; count: number }> = [];
  for (let h = startHour; h !== (nowHour + 1) % 24; h = (h + 1) % 24) {
    hours.push({ hour: h, count: hourCounts.get(h) ?? 0 });
    if (hours.length > 12) break;
  }
  const peakBucket = Math.max(1, ...hours.map((h) => h.count));

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between">
        <div>
          <p className="label-mono">Live</p>
          <h2 className="font-display text-2xl text-cream uppercase tracking-wide">
            {active.event.name}
          </h2>
          <p className="label-mono mt-1">Doors {fmtTime(active.doors_at)}</p>
        </div>
        <RealtimeCounters nightId={active.id} />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <p className="label-mono">Scanned in</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {scannedTotal}
            {cap > 0 && <span className="text-muted text-base">/{cap}</span>}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Approved</p>
          <p className="font-display text-3xl text-mint leading-none mt-1">
            {approved}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Pending</p>
          <p className="font-display text-3xl text-gold leading-none mt-1">
            {pending}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Capacity</p>
          <p className="font-display text-3xl text-coral leading-none mt-1">
            {pctFull}%
          </p>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <p className="label-mono mb-3">Velocity by hour (tonight)</p>
          <div className="flex items-end gap-1 h-24">
            {hours.map((h) => (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center gap-1 min-w-[12px]"
                title={`${fmtHourLabel(h.hour)}: ${h.count}`}
              >
                <div
                  className="w-full rounded-t bg-mint/70"
                  style={{ height: `${(h.count / peakBucket) * 100}%` }}
                />
                <p className="label-mono text-[9px]">
                  {fmtHourLabel(h.hour).replace(":00", "")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label-mono mb-3">Tier split tonight</p>
          {(["ga", "vip", "all_access"] as const).map((t) => (
            <div key={t} className="mb-2">
              <p className="label-mono mb-0.5">
                {t === "all_access" ? "AA" : t.toUpperCase()} ·{" "}
                <span className="text-mint">{tierCounts[t].in}</span>{" "}
                <span className="text-muted">in / {tierCounts[t].rsvp} RSVP</span>
              </p>
              <div className="h-2 rounded bg-s3 overflow-hidden">
                <div
                  className={
                    t === "vip" ? "bg-gold h-full" : t === "all_access" ? "bg-lav h-full" : "bg-cream h-full"
                  }
                  style={{
                    width: `${
                      tierCounts[t].rsvp === 0
                        ? 0
                        : (tierCounts[t].in / tierCounts[t].rsvp) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Promoter performance · tonight</p>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-2">Holder</th>
                <th className="text-right">Submitted</th>
                <th className="text-right">Approved</th>
                <th className="text-right">In</th>
                <th className="text-right">Show</th>
                <th className="text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {[...promoters.entries()]
                .sort((a, b) => b[1].in - a[1].in)
                .map(([name, v]) => {
                  const show =
                    v.approved === 0 ? 0 : Math.round((v.in / v.approved) * 100);
                  return (
                    <tr key={name} className="border-t border-line">
                      <td className="py-2 text-cream truncate">{name}</td>
                      <td className="py-2 text-right">{v.submitted}</td>
                      <td className="py-2 text-right">{v.approved}</td>
                      <td className="py-2 text-right text-mint">{v.in}</td>
                      <td className="py-2 text-right">{show}%</td>
                      <td className="py-2 text-right text-gold">{v.pending}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Live check-in feed</p>
        {scans.length === 0 ? (
          <p className="text-muted text-sm">No scans yet tonight.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {scans.slice(0, 25).map((s, i) => (
              <li
                key={i}
                className="flex items-baseline gap-3 text-sm border-t border-line pt-1"
              >
                <span className="label-mono shrink-0">
                  {new Date(s.scanned_at).toLocaleTimeString()}
                </span>
                <span className="font-sans text-cream truncate flex-1">
                  {s.guest?.full_name ?? "—"}
                </span>
                <span className="label-mono">
                  {s.guest?.tier?.toUpperCase() ?? "—"}
                </span>
                <span className="label-mono text-muted truncate max-w-[30%]">
                  {s.guest?.allocation?.holder_name ?? "Walk-up"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/owner/events/${active.event.id}`}
        className="btn-ghost text-center"
      >
        Open event daydash →
      </Link>
    </div>
  );
}
