import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { PageHeader } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar — WADL" };

interface NightRow {
  id: string;
  event_id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
  event: { id: string; name: string };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  if (searchParams.m && /^\d{4}-\d{2}$/.test(searchParams.m)) {
    const [y, mo] = searchParams.m.split("-").map(Number);
    viewYear = y;
    viewMonth = mo - 1;
  }

  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  const startDow = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const { data: nightsRaw } = await supabase
    .from("event_nights")
    .select(
      "id, event_id, night_date, doors_at, capacity_cap, event:events!inner(id, name, account_id)",
    )
    .gte("night_date", ymd(monthStart))
    .lte("night_date", ymd(monthEnd));
  const nights = (
    (nightsRaw ?? []) as unknown as Array<
      NightRow & { event: { account_id: string } }
    >
  ).filter((n) => n.event.account_id === account.id);

  const nightIds = nights.map((n) => n.id);
  const totalsMap = new Map<
    string,
    { approved: number; scanned: number }
  >();
  if (nightIds.length > 0) {
    const [guestRes, scanRes] = await Promise.all([
      supabase
        .from("guests")
        .select("event_night_id, plus_ones, status")
        .in("event_night_id", nightIds),
      supabase
        .from("check_ins")
        .select("event_night_id, state")
        .in("event_night_id", nightIds),
    ]);
    for (const id of nightIds) totalsMap.set(id, { approved: 0, scanned: 0 });
    for (const g of (guestRes.data ?? []) as Array<{
      event_night_id: string;
      plus_ones: number;
      status: string;
    }>) {
      if (g.status === "approved") {
        const slot = totalsMap.get(g.event_night_id)!;
        slot.approved += 1 + (g.plus_ones ?? 0);
      }
    }
    for (const c of (scanRes.data ?? []) as Array<{
      event_night_id: string;
      state: string;
    }>) {
      if (c.state === "approved") {
        const slot = totalsMap.get(c.event_night_id)!;
        slot.scanned += 1;
      }
    }
  }

  const byDay = new Map<string, NightRow[]>();
  for (const n of nights) {
    const k = n.night_date;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(n);
  }

  const prev = new Date(viewYear, viewMonth - 1, 1);
  const next = new Date(viewYear, viewMonth + 1, 1);
  const prevHref = `/owner/calendar?m=${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/owner/calendar?m=${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const cells: Array<
    { day: number; date: string; night: NightRow[] } | null
  > = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = ymd(new Date(viewYear, viewMonth, d));
    cells.push({
      day: d,
      date,
      night: byDay.get(date) ?? [],
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const eventCount = nights.length;

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PageHeader
        eyebrow="Calendar"
        title={`${MONTH_NAMES[viewMonth]} ${viewYear}`}
        sub={`${eventCount} event${eventCount === 1 ? "" : "s"} this month`}
        actions={
          <>
            <Link
              href={prevHref}
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
              aria-label="Previous month"
            >
              ←
            </Link>
            <Link
              href="/owner/calendar"
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
            >
              Today
            </Link>
            <Link
              href={nextHref}
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
              aria-label="Next month"
            >
              →
            </Link>
          </>
        }
      />

      <div style={{ padding: "var(--s-8)" }}>
        {/* Day-of-week headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "var(--s-1)",
            marginBottom: "var(--s-2)",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="t-meta"
              style={{ textAlign: "center" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "var(--s-1)",
          }}
        >
          {cells.map((c, i) => {
            if (!c) {
              return (
                <div
                  key={`blank-${i}`}
                  style={{
                    aspectRatio: "1 / 1",
                    background: "var(--bg)",
                    borderRadius: "var(--r-sm)",
                  }}
                />
              );
            }
            const isToday = c.date === ymd(now);
            const has = c.night.length > 0;
            const totals = c.night.reduce(
              (acc, n) => {
                const t = totalsMap.get(n.id) ?? {
                  approved: 0,
                  scanned: 0,
                };
                acc.cap += n.capacity_cap ?? 0;
                acc.approved += t.approved;
                acc.scanned += t.scanned;
                return acc;
              },
              { cap: 0, approved: 0, scanned: 0 },
            );
            const pct =
              totals.cap > 0
                ? Math.round((totals.approved / totals.cap) * 100)
                : 0;
            const pctColor =
              pct >= 90
                ? "var(--err)"
                : pct >= 60
                  ? "var(--warn)"
                  : "var(--ok)";
            return (
              <Link
                key={c.date}
                href={
                  has && c.night[0]
                    ? `/owner/events/${c.night[0].event_id}?night=${c.night[0].id}`
                    : `/owner?range=upcoming`
                }
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    padding: "var(--s-2)",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid",
                    borderColor: isToday
                      ? "var(--line-3)"
                      : has
                        ? "var(--line-2)"
                        : "var(--line)",
                    background: isToday
                      ? "var(--bg-3)"
                      : has
                        ? "var(--bg-2)"
                        : "var(--bg)",
                    transition: "border-color .12s, background .12s",
                  }}
                >
                  <div
                    className="t-num"
                    style={{
                      fontFamily: "var(--display)",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1,
                      color: isToday ? "var(--fg)" : "var(--fg-2)",
                    }}
                  >
                    {c.day}
                  </div>
                  {has && (
                    <div style={{ marginTop: "auto" }}>
                      <div
                        className="t-h2 truncate"
                        style={{ fontSize: 12 }}
                      >
                        {c.night[0].event.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--s-1)",
                          marginTop: "var(--s-1)",
                        }}
                      >
                        <span className="t-meta">
                          {c.night.length} ev
                        </span>
                        {totals.cap > 0 && (
                          <span
                            className="t-meta"
                            style={{ color: pctColor }}
                          >
                            · {pct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: "var(--s-6)",
            display: "flex",
            gap: "var(--s-3)",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <span className="chip">Today</span>
          <span className="chip chip--ghost">Has event</span>
          <span className="t-meta" style={{ alignSelf: "center" }}>
            Tap a day to open its event ·{" "}
            <Link
              href="/owner"
              style={{ color: "var(--fg)", textDecoration: "none" }}
            >
              List view →
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
