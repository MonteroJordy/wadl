import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { Button, Chip } from "@/components/wadl";

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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">CALENDAR</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {eventCount} event{eventCount === 1 ? "" : "s"} this month
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Link href={prevHref} style={{ textDecoration: "none" }}>
              <Button
                variant="ghost"
                style={{ height: 36, padding: "0 14px" }}
                aria-label="Previous month"
              >
                ←
              </Button>
            </Link>
            <Link href="/owner/calendar" style={{ textDecoration: "none" }}>
              <Button
                variant="ghost"
                style={{ height: 36, padding: "0 14px" }}
              >
                Today
              </Button>
            </Link>
            <Link href={nextHref} style={{ textDecoration: "none" }}>
              <Button
                variant="ghost"
                style={{ height: 36, padding: "0 14px" }}
                aria-label="Next month"
              >
                →
              </Button>
            </Link>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginTop: 24,
            marginBottom: 6,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="w-type-meta"
              style={{ textAlign: "center" }}
            >
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {cells.map((c, i) => {
            if (!c) {
              return (
                <div
                  key={`blank-${i}`}
                  style={{
                    aspectRatio: "1 / 1",
                    background: "rgba(255,255,255,0.02)",
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
            const pctTone =
              pct >= 90
                ? "var(--w-err)"
                : pct >= 60
                  ? "var(--w-warn)"
                  : "var(--w-ok)";
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
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid",
                    borderColor: isToday
                      ? "var(--w-acc)"
                      : has
                        ? "oklch(0.86 0.18 145 / 0.4)"
                        : "var(--w-line)",
                    background: isToday
                      ? "var(--w-acc-soft)"
                      : has
                        ? "var(--w-surface-2)"
                        : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 18,
                      letterSpacing: "-0.025em",
                      lineHeight: 1,
                      color: isToday ? "var(--w-acc-ink)" : "var(--w-fg)",
                    }}
                  >
                    {c.day}
                  </div>
                  {has && (
                    <div style={{ marginTop: "auto" }}>
                      <div
                        className="w-type-meta"
                        style={{
                          fontSize: 9,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.night.length} EV
                      </div>
                      {totals.cap > 0 && (
                        <div
                          className="w-type-meta"
                          style={{
                            fontSize: 9,
                            color: pctTone,
                          }}
                        >
                          {pct}%
                        </div>
                      )}
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
            marginTop: 24,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Chip tone="acc">TODAY</Chip>
          <Chip tone="ok">EVENT</Chip>
          <Chip tone="ghost">EMPTY</Chip>
        </div>

        <div
          className="w-type-meta"
          style={{
            marginTop: 24,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          TAP A DAY TO JUMP INTO ITS EVENT ·{" "}
          <Link
            href="/owner"
            style={{
              color: "var(--w-acc)",
              textDecoration: "none",
            }}
          >
            LIST VIEW →
          </Link>
        </div>
      </div>
    </main>
  );
}
