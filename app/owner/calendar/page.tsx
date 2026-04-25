import Link from "next/link";
import { requireOwnerContext, fmtTime } from "@/lib/owner";

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
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

  // Month navigation: ?m=YYYY-MM (default = current).
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
  const startDow = monthStart.getDay(); // 0 Sun..6 Sat
  const daysInMonth = monthEnd.getDate();

  const { data: nightsRaw } = await supabase
    .from("event_nights")
    .select(
      "id, event_id, night_date, doors_at, capacity_cap, event:events!inner(id, name, account_id)"
    )
    .gte("night_date", ymd(monthStart))
    .lte("night_date", ymd(monthEnd));
  const nights = (
    (nightsRaw ?? []) as unknown as Array<NightRow & { event: { account_id: string } }>
  ).filter((n) => n.event.account_id === account.id);

  // For each night, count approved heads + scanned to compute capacity %.
  const nightIds = nights.map((n) => n.id);
  const totalsMap = new Map<string, { approved: number; scanned: number }>();
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

  // Group nights by night_date for the grid.
  const byDay = new Map<string, NightRow[]>();
  for (const n of nights) {
    const k = n.night_date;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(n);
  }

  // Prev / next month hrefs.
  const prev = new Date(viewYear, viewMonth - 1, 1);
  const next = new Date(viewYear, viewMonth + 1, 1);
  const prevHref = `/owner/calendar?m=${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/owner/calendar?m=${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  // Build the day cells (with leading blanks for the first row).
  const cells: Array<{ day: number; date: string; night: NightRow[] } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = ymd(new Date(viewYear, viewMonth, d));
    cells.push({
      day: d,
      date,
      night: byDay.get(date) ?? [],
    });
  }
  // pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="label-mono mb-1">Calendar</p>
          <h1 className="display-lg">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            className="px-3 py-2 rounded-md border border-line text-cream hover:border-cream/30 transition label-mono"
            aria-label="Previous month"
          >
            ←
          </Link>
          <Link
            href="/owner/calendar"
            className="px-3 py-2 rounded-md border border-line text-cream hover:border-cream/30 transition label-mono"
          >
            Today
          </Link>
          <Link
            href={nextHref}
            className="px-3 py-2 rounded-md border border-line text-cream hover:border-cream/30 transition label-mono"
            aria-label="Next month"
          >
            →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <p key={d} className="label-mono text-center">
            {d}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) {
            return (
              <div
                key={`blank-${i}`}
                className="aspect-square bg-s1/40 rounded-md"
              />
            );
          }
          const isToday = c.date === ymd(now);
          const has = c.night.length > 0;
          const totals = c.night.reduce(
            (acc, n) => {
              const t = totalsMap.get(n.id) ?? { approved: 0, scanned: 0 };
              acc.cap += n.capacity_cap ?? 0;
              acc.approved += t.approved;
              acc.scanned += t.scanned;
              return acc;
            },
            { cap: 0, approved: 0, scanned: 0 }
          );
          const pct = totals.cap > 0 ? Math.round((totals.approved / totals.cap) * 100) : 0;
          return (
            <Link
              key={c.date}
              href={
                has && c.night[0]
                  ? `/owner/events/${c.night[0].event_id}?night=${c.night[0].id}`
                  : `/owner?range=upcoming`
              }
              className={`aspect-square rounded-md p-1 md:p-2 flex flex-col text-left transition border ${
                isToday
                  ? "border-coral bg-s2"
                  : has
                  ? "border-mint/30 bg-s1 hover:border-mint/60"
                  : "border-line bg-s1/60 hover:border-cream/20"
              }`}
            >
              <p
                className={`font-display text-base md:text-lg leading-none ${
                  isToday ? "text-coral" : "text-cream"
                }`}
              >
                {c.day}
              </p>
              {has && (
                <div className="mt-auto">
                  <p className="label-mono text-[9px] truncate">
                    {c.night.length} ev
                  </p>
                  {totals.cap > 0 && (
                    <p
                      className={`label-mono text-[9px] ${
                        pct >= 90
                          ? "text-coral"
                          : pct >= 60
                          ? "text-gold"
                          : "text-mint"
                      }`}
                    >
                      {pct}%
                    </p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <p className="label-mono mt-6 text-center">
        Tap a day to jump into its event. <Link href="/owner" className="text-coral hover:text-cream">Switch to list view →</Link>
      </p>
    </main>
  );
}
