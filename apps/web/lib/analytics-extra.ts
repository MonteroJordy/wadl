import { createAdminClient } from "@/lib/supabase/admin";

export interface HourBucket {
  hour: number;
  count: number;
  pct: number;
}

export interface CapacityRow {
  event_id: string;
  event_name: string;
  date: string;
  in_count: number;
  cap: number;
  pct: number;
  status: "near_cap" | "sold_out" | "normal" | "low";
}

export interface RetentionPoint {
  month: string;
  /** % of guests from N months ago who came back this month */
  rate: number;
  returned: number;
  base: number;
}

export interface SegmentBreakdown {
  first_timers: number;
  returning: number;
  regulars: number;
  /** sums to 100 */
  pct: { first_timers: number; returning: number; regulars: number };
}

export interface TopGuestRow {
  full_name: string;
  phone: string | null;
  events_attended: number;
  last_seen: string;
  show_rate: number;
  avg_tier: string;
}

export interface ExtraAnalytics {
  /** Check-in velocity by hour-of-day across all events in window. */
  hourVelocity: HourBucket[];
  /** Per-event capacity utilization in window. */
  capacityRows: CapacityRow[];
  /** Avg dwell-time minutes (last scan - first scan, average across events). */
  avgDwellMin: number;
  /** Best night-of-week label + avg checked-in. */
  bestNight: { label: string; avg: number; events: number } | null;
  /** Best event name + count. */
  bestEvent: { name: string; count: number } | null;
  /** Peak hour-of-day + % of all check-ins. */
  peakHour: { hour: number; pct: number } | null;
  /** % of guests who came back to a 2nd+ event in the window. */
  retentionRate: number;
  /** Headcount by segment. */
  segments: SegmentBreakdown;
  /** Top 10 returning guests by event count. */
  topGuests: TopGuestRow[];
  /** Window start ISO. */
  windowStart: string;
}

interface NightRowOpaque {
  id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
  event: { id: string; name: string; account_id: string };
}

interface ScanRowOpaque {
  guest_id: string;
  scanned_at: string;
  event_night_id: string;
  state: string;
  guest: {
    full_name: string;
    phone: string | null;
    tier: string;
  } | null;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pickAvgTier(tiers: string[]): string {
  if (tiers.length === 0) return "ga";
  const counts: Record<string, number> = {};
  for (const t of tiers) counts[t] = (counts[t] ?? 0) + 1;
  return (
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ga"
  ).toUpperCase();
}

export async function computeExtraAnalytics(
  accountId: string,
  windowDays = 90
): Promise<ExtraAnalytics> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffIso = cutoff.toISOString();

  const { data: nightsRaw } = await admin
    .from("event_nights")
    .select(
      "id, night_date, doors_at, capacity_cap, event:events!inner(id, name, account_id)"
    )
    .gte("doors_at", cutoffIso);
  const nights = ((nightsRaw ?? []) as unknown as NightRowOpaque[]).filter(
    (n) => n.event.account_id === accountId
  );

  if (nights.length === 0) {
    return {
      hourVelocity: [],
      capacityRows: [],
      avgDwellMin: 0,
      bestNight: null,
      bestEvent: null,
      peakHour: null,
      retentionRate: 0,
      segments: {
        first_timers: 0,
        returning: 0,
        regulars: 0,
        pct: { first_timers: 0, returning: 0, regulars: 0 },
      },
      topGuests: [],
      windowStart: cutoffIso,
    };
  }

  const nightIds = nights.map((n) => n.id);
  const { data: scansRaw } = await admin
    .from("check_ins")
    .select(
      "guest_id, scanned_at, event_night_id, state, guest:guests!inner(full_name, phone, tier)"
    )
    .in("event_night_id", nightIds)
    .eq("state", "approved");
  const scans = (scansRaw ?? []) as unknown as ScanRowOpaque[];

  // Hour velocity (0–23). Show in event-local time; we use UTC since we don't
  // know venue tz here. For Miami most events fall 21:00–05:00 UTC-4, which
  // displays as 01:00–09:00 UTC — readable enough for a trend chart.
  const hourCounts = new Map<number, number>();
  for (const s of scans) {
    const h = new Date(s.scanned_at).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  const totalScans = scans.length;
  const hourVelocity: HourBucket[] = [];
  for (let h = 0; h < 24; h++) {
    const c = hourCounts.get(h) ?? 0;
    hourVelocity.push({
      hour: h,
      count: c,
      pct: totalScans === 0 ? 0 : c / totalScans,
    });
  }
  const peakHourBucket = [...hourVelocity].sort((a, b) => b.count - a.count)[0];
  const peakHour =
    peakHourBucket && peakHourBucket.count > 0
      ? { hour: peakHourBucket.hour, pct: peakHourBucket.pct }
      : null;

  // Capacity rows.
  const scansByNight = new Map<string, number>();
  for (const s of scans) {
    scansByNight.set(s.event_night_id, (scansByNight.get(s.event_night_id) ?? 0) + 1);
  }
  const capacityRows: CapacityRow[] = nights
    .map((n) => {
      const inCount = scansByNight.get(n.id) ?? 0;
      const cap = n.capacity_cap ?? 0;
      const pct = cap > 0 ? inCount / cap : 0;
      const status: CapacityRow["status"] =
        cap > 0 && pct >= 0.95
          ? "sold_out"
          : pct >= 0.8
          ? "near_cap"
          : pct >= 0.4
          ? "normal"
          : "low";
      return {
        event_id: n.event.id,
        event_name: n.event.name,
        date: n.night_date,
        in_count: inCount,
        cap,
        pct,
        status,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  // Best event by single-night count.
  const bestEvent = (() => {
    if (capacityRows.length === 0) return null;
    const top = capacityRows.reduce((acc, r) =>
      r.in_count > acc.in_count ? r : acc
    );
    return { name: top.event_name, count: top.in_count };
  })();

  // Best night-of-week.
  const dowAgg = new Map<number, { events: Set<string>; total: number }>();
  for (let i = 0; i < 7; i++) dowAgg.set(i, { events: new Set(), total: 0 });
  for (const n of nights) {
    const d = new Date(n.night_date + "T12:00:00").getDay();
    const slot = dowAgg.get(d)!;
    slot.events.add(n.id);
    slot.total += scansByNight.get(n.id) ?? 0;
  }
  const bestNight = (() => {
    const arr = [...dowAgg.entries()]
      .filter(([, v]) => v.events.size > 0)
      .map(([dow, v]) => ({
        label: DOW_LABELS[dow],
        avg: Math.round(v.total / v.events.size),
        events: v.events.size,
      }))
      .sort((a, b) => b.avg - a.avg);
    return arr[0] ?? null;
  })();

  // Avg dwell time per night.
  const dwellMins: number[] = [];
  const scansByNightSorted = new Map<string, ScanRowOpaque[]>();
  for (const s of scans) {
    const arr = scansByNightSorted.get(s.event_night_id) ?? [];
    arr.push(s);
    scansByNightSorted.set(s.event_night_id, arr);
  }
  for (const arr of scansByNightSorted.values()) {
    if (arr.length < 2) continue;
    const ts = arr.map((s) => new Date(s.scanned_at).getTime());
    const min = Math.min(...ts);
    const max = Math.max(...ts);
    dwellMins.push((max - min) / 60_000);
  }
  const avgDwellMin =
    dwellMins.length === 0
      ? 0
      : Math.round(dwellMins.reduce((s, v) => s + v, 0) / dwellMins.length);

  // Retention + segments + top guests, by phone.
  const perPhone = new Map<
    string,
    {
      full_name: string;
      events: Set<string>;
      tiers: string[];
      last_seen: string;
    }
  >();
  for (const s of scans) {
    const ph = s.guest?.phone;
    if (!ph || !s.guest) continue;
    if (!perPhone.has(ph)) {
      perPhone.set(ph, {
        full_name: s.guest.full_name,
        events: new Set(),
        tiers: [],
        last_seen: s.scanned_at,
      });
    }
    const p = perPhone.get(ph)!;
    // event_id from nightId.
    const ev = nights.find((n) => n.id === s.event_night_id)?.event.id;
    if (ev) p.events.add(ev);
    p.tiers.push(s.guest.tier);
    if (s.scanned_at > p.last_seen) p.last_seen = s.scanned_at;
  }

  let firstTimers = 0;
  let returning = 0;
  let regulars = 0;
  for (const p of perPhone.values()) {
    const c = p.events.size;
    if (c === 1) firstTimers++;
    else if (c <= 3) returning++;
    else regulars++;
  }
  const totalUniq = firstTimers + returning + regulars;
  const segments: SegmentBreakdown = {
    first_timers: firstTimers,
    returning,
    regulars,
    pct:
      totalUniq === 0
        ? { first_timers: 0, returning: 0, regulars: 0 }
        : {
            first_timers: Math.round((firstTimers / totalUniq) * 100),
            returning: Math.round((returning / totalUniq) * 100),
            regulars: Math.round((regulars / totalUniq) * 100),
          },
  };
  const retentionRate =
    totalUniq === 0 ? 0 : (returning + regulars) / totalUniq;

  const topGuests: TopGuestRow[] = [...perPhone.entries()]
    .map(([phone, v]) => ({
      full_name: v.full_name,
      phone,
      events_attended: v.events.size,
      last_seen: v.last_seen,
      show_rate: 1, // simplified — only showed-up scans are in this view
      avg_tier: pickAvgTier(v.tiers),
    }))
    .sort((a, b) => {
      if (b.events_attended !== a.events_attended)
        return b.events_attended - a.events_attended;
      return b.last_seen.localeCompare(a.last_seen);
    })
    .slice(0, 10);

  return {
    hourVelocity,
    capacityRows,
    avgDwellMin,
    bestNight,
    bestEvent,
    peakHour,
    retentionRate,
    segments,
    topGuests,
    windowStart: cutoffIso,
  };
}
