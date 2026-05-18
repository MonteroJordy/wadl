import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import {
  Breadcrumb,
  EventSubNav,
  PageHeader,
  Stat,
} from "@/components/v5";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

interface CurvePoint {
  minute: number;
  count: number;
}

export default async function PostEventReport({ params }: PageProps) {
  const { supabase } = await requireOwnerContext();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev) notFound();

  const { data: nights } = await supabase
    .from("event_nights")
    .select("id, night_date, doors_at, capacity_cap")
    .eq("event_id", params.id)
    .order("night_date", { ascending: false });
  const focus = nights?.[0] ?? null;
  if (!focus) {
    return (
      <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Breadcrumb items={[["Events", "/owner"], ev.name, "Report"]} />
        <EventSubNav active="overview" eventId={params.id} />
        <PageHeader eyebrow={ev.name} title="Report" sub="No nights to report on yet." />
      </main>
    );
  }

  // Pull scans + guests in parallel.
  const [
    { data: scans },
    { count: approved },
    { count: scannedCount },
    { count: noShows },
    { data: topHoldersRaw },
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("scanned_at")
      .eq("event_night_id", focus.id)
      .order("scanned_at", { ascending: true }),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", focus.id)
      .eq("status", "approved"),
    supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", focus.id),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", focus.id)
      .eq("status", "no_show"),
    supabase
      .from("guests")
      .select(
        "allocation:allocations(holder_name), check_ins(state)",
      )
      .eq("event_night_id", focus.id),
  ]);

  const scanRows = scans ?? [];
  const showRate =
    (approved ?? 0) > 0
      ? Math.round(((scannedCount ?? 0) / (approved ?? 1)) * 100)
      : 0;
  const noShowPct =
    (approved ?? 0) > 0
      ? Math.round(((noShows ?? 0) / (approved ?? 1)) * 100 * 10) / 10
      : 0;

  // Build the scan curve binned by minute, relative to doors_at.
  const doorsMs = new Date(focus.doors_at).getTime();
  const buckets = new Map<number, number>();
  let lastScanMs = doorsMs;
  for (const s of scanRows) {
    const t = new Date(s.scanned_at).getTime();
    if (t > lastScanMs) lastScanMs = t;
    const minute = Math.max(0, Math.floor((t - doorsMs) / 60000));
    buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
  }
  const totalMin = Math.max(60, Math.ceil((lastScanMs - doorsMs) / 60000));
  const curve: CurvePoint[] = [];
  for (let m = 0; m <= totalMin; m += Math.max(1, Math.floor(totalMin / 60))) {
    curve.push({ minute: m, count: buckets.get(m) ?? 0 });
  }
  const peakBucket = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakTime = peakBucket
    ? new Date(doorsMs + peakBucket[0] * 60000)
    : null;

  // Median time between scans → "median wait" proxy.
  const deltas: number[] = [];
  for (let i = 1; i < scanRows.length; i++) {
    deltas.push(
      (new Date(scanRows[i].scanned_at).getTime() -
        new Date(scanRows[i - 1].scanned_at).getTime()) /
        1000,
    );
  }
  deltas.sort((a, b) => a - b);
  const medianWait = deltas.length
    ? Math.round(deltas[Math.floor(deltas.length / 2)])
    : null;

  // Per-promoter (holder) summary.
  type Holder = { name: string; approved: number; scanned: number };
  const holders = new Map<string, Holder>();
  for (const g of topHoldersRaw ?? []) {
    const alloc = Array.isArray(g.allocation) ? g.allocation[0] : g.allocation;
    if (!alloc?.holder_name) continue;
    const key = alloc.holder_name.toLowerCase().trim();
    const h = holders.get(key) ?? { name: alloc.holder_name, approved: 0, scanned: 0 };
    h.approved += 1;
    if (g.check_ins.some((c: { state: string }) => c.state === "approved")) {
      h.scanned += 1;
    }
    holders.set(key, h);
  }
  const topPromoters = [...holders.values()]
    .filter((h) => h.approved >= 3)
    .map((h) => ({
      ...h,
      pct: h.approved === 0 ? 0 : Math.round((h.scanned / h.approved) * 100),
    }))
    .sort((a, b) => b.scanned - a.scanned)
    .slice(0, 6);

  // SVG path
  const peakCount = Math.max(1, ...curve.map((c) => c.count));
  const w = 600;
  const h = 200;
  const pathPoints = curve
    .map((c, i) => {
      const x = curve.length === 1 ? 0 : (i / (curve.length - 1)) * w;
      const y = h - 10 - (c.count / peakCount) * (h - 20);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Breadcrumb items={[["Events", "/owner"], ev.name, "Report"]} />
      <EventSubNav active="overview" eventId={params.id} />
      <PageHeader
        eyebrow={`Closed · ${fmtDate(focus.night_date)}`}
        title="The night in numbers"
        sub={`Doors ${fmtTime(focus.doors_at)} · ${scannedCount ?? 0} in · ${noShows ?? 0} no-shows.`}
        actions={
          <a
            href={`/api/owner/events/${params.id}/report.csv`}
            className="btn"
            style={{ textDecoration: "none" }}
          >
            Export
          </a>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat
          label="Scanned in"
          value={String(scannedCount ?? 0)}
          sub={`${showRate}%`}
        />
        <Stat
          label="No-shows"
          value={String(noShows ?? 0)}
          sub={`${noShowPct}%`}
        />
        <Stat
          label="Peak"
          value={peakTime ? fmtTime(peakTime.toISOString()) : "—"}
          sub={peakBucket ? `${peakBucket[1]} in 1min` : ""}
        />
        <Stat
          label="Median wait"
          value={medianWait != null ? `${medianWait}s` : "—"}
          sub={deltas[0] != null ? `best ${Math.round(deltas[0])}s` : ""}
          last
        />
      </div>

      <div
        style={{
          padding: "var(--s-8)",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "var(--s-4)",
        }}
        className="post-event-grid"
      >
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Scan curve
          </div>
          <div className="card" style={{ padding: "var(--s-5)" }}>
            {curve.length > 1 ? (
              <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 40 + 10}
                    x2={w}
                    y2={i * 40 + 10}
                    stroke="var(--line)"
                  />
                ))}
                <path
                  d={pathPoints}
                  stroke="var(--fg)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            ) : (
              <div className="t-body-2" style={{ color: "var(--fg-3)" }}>
                Not enough scans to draw a curve yet.
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Top promoters
          </div>
          {topPromoters.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "var(--s-5)",
                color: "var(--fg-3)",
              }}
            >
              <span className="t-body-2">
                No promoter lists had enough RSVPs to rank.
              </span>
            </div>
          ) : (
            <div className="card">
              {topPromoters.map((p) => (
                <div
                  key={p.name}
                  className="row"
                  style={{ gridTemplateColumns: "1fr 80px 60px" }}
                >
                  <span className="t-h2 truncate">{p.name}</span>
                  <span className="t-meta">
                    {p.scanned}/{p.approved}
                  </span>
                  <span
                    className="t-body"
                    style={{
                      color:
                        p.pct >= 85
                          ? "var(--ok)"
                          : p.pct >= 70
                            ? "var(--warn)"
                            : "var(--err)",
                      textAlign: "right",
                    }}
                  >
                    {p.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .post-event-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
