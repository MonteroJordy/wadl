import { createAdminClient } from "@/lib/supabase/admin";

export interface AnalyticsBucket {
  /** ISO date (YYYY-MM-DD) the night ran. */
  date: string;
  approved: number;
  scanned: number;
}

export interface VenueBreakdown {
  venue_id: string | null;
  venue_name: string;
  events: number;
  approved: number;
  scanned: number;
  show_rate: number;
}

export interface DowBreakdown {
  /** 0=Sun..6=Sat */
  dow: number;
  label: string;
  events: number;
  scanned: number;
}

export interface TierBreakdown {
  tier: string;
  scanned: number;
  pct: number;
}

export interface AnalyticsSummary {
  trend: AnalyticsBucket[];
  byVenue: VenueBreakdown[];
  byDow: DowBreakdown[];
  byTier: TierBreakdown[];
  totalApproved: number;
  totalScanned: number;
  showRate: number;
  topHolders: Array<{
    name: string;
    scanned: number;
    events: number;
    show_rate: number;
  }>;
  bestDow: DowBreakdown | null;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface NightRow {
  id: string;
  night_date: string;
  doors_at: string;
  event: { id: string; name: string; venue_id: string | null; venue: { name: string } | null };
}

interface GuestAggRow {
  event_night_id: string;
  allocation_id: string | null;
  plus_ones: number;
  status: string;
  tier: string;
  allocation: { holder_name: string } | null;
  check_ins: Array<{ state: string }>;
}

/**
 * 90-day rolling analytics across all events for an account.
 */
export async function computeAccountAnalytics(
  accountId: string
): Promise<AnalyticsSummary> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffIso = cutoff.toISOString();

  // Pull nights with their event + venue.
  const { data: nightsRaw } = await admin
    .from("event_nights")
    .select(
      "id, night_date, doors_at, event:events!inner(id, name, account_id, venue_id, venue:venues(name))"
    )
    .gte("doors_at", cutoffIso);

  const nights = (
    (nightsRaw ?? []) as unknown as Array<
      NightRow & { event: { account_id: string } }
    >
  )
    .filter((n) => n.event.account_id === accountId)
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  if (nights.length === 0) {
    return {
      trend: [],
      byVenue: [],
      byDow: DOW_LABELS.map((label, dow) => ({ dow, label, events: 0, scanned: 0 })),
      byTier: [],
      totalApproved: 0,
      totalScanned: 0,
      showRate: 0,
      topHolders: [],
      bestDow: null,
    };
  }

  const nightIds = nights.map((n) => n.id);
  const { data: guestsRaw } = await admin
    .from("guests")
    .select(
      "event_night_id, allocation_id, plus_ones, status, tier, allocation:allocations(holder_name), check_ins(state)"
    )
    .in("event_night_id", nightIds);
  const guests = (guestsRaw ?? []) as unknown as GuestAggRow[];

  // Per-night aggregate.
  const perNight = new Map<
    string,
    { approved: number; scanned: number }
  >();
  for (const n of nights) perNight.set(n.id, { approved: 0, scanned: 0 });

  // Per-holder aggregate.
  const perHolder = new Map<
    string,
    { name: string; scanned: number; approved: number; nights: Set<string> }
  >();

  // Per-tier scanned head count.
  const tierAgg = new Map<string, number>();

  for (const g of guests) {
    if (g.status !== "approved") continue;
    const heads = 1 + (g.plus_ones ?? 0);
    const slot = perNight.get(g.event_night_id);
    if (!slot) continue;
    slot.approved += heads;
    const scannedHere = g.check_ins.some((c) => c.state === "approved");
    if (scannedHere) {
      slot.scanned += heads;
      const tk = (g.tier ?? "ga").toString();
      tierAgg.set(tk, (tierAgg.get(tk) ?? 0) + heads);
    }
    if (g.allocation?.holder_name) {
      const key = g.allocation.holder_name.toLowerCase().trim();
      if (!perHolder.has(key)) {
        perHolder.set(key, {
          name: g.allocation.holder_name,
          scanned: 0,
          approved: 0,
          nights: new Set(),
        });
      }
      const h = perHolder.get(key)!;
      h.approved += heads;
      if (scannedHere) h.scanned += heads;
      h.nights.add(g.event_night_id);
    }
  }

  // Build trend by date.
  const trendMap = new Map<string, { approved: number; scanned: number }>();
  for (const n of nights) {
    const slot = perNight.get(n.id) ?? { approved: 0, scanned: 0 };
    const cur = trendMap.get(n.night_date) ?? { approved: 0, scanned: 0 };
    trendMap.set(n.night_date, {
      approved: cur.approved + slot.approved,
      scanned: cur.scanned + slot.scanned,
    });
  }
  const trend: AnalyticsBucket[] = [...trendMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, approved: v.approved, scanned: v.scanned }));

  // Venue breakdown.
  const venueMap = new Map<
    string,
    { id: string | null; name: string; events: Set<string>; approved: number; scanned: number }
  >();
  for (const n of nights) {
    const vid = n.event.venue_id ?? "_no_venue";
    const name = n.event.venue?.name ?? (n.event.venue_id ? "Unknown" : "No venue");
    if (!venueMap.has(vid)) {
      venueMap.set(vid, {
        id: n.event.venue_id ?? null,
        name,
        events: new Set(),
        approved: 0,
        scanned: 0,
      });
    }
    const v = venueMap.get(vid)!;
    v.events.add(n.event.id);
    const slot = perNight.get(n.id) ?? { approved: 0, scanned: 0 };
    v.approved += slot.approved;
    v.scanned += slot.scanned;
  }
  const byVenue: VenueBreakdown[] = [...venueMap.values()]
    .map((v) => ({
      venue_id: v.id,
      venue_name: v.name,
      events: v.events.size,
      approved: v.approved,
      scanned: v.scanned,
      show_rate: v.approved === 0 ? 0 : v.scanned / v.approved,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  // DoW breakdown.
  const dowAgg = new Map<number, { events: Set<string>; scanned: number }>();
  for (let i = 0; i < 7; i++) dowAgg.set(i, { events: new Set(), scanned: 0 });
  for (const n of nights) {
    const dow = new Date(n.night_date + "T12:00:00").getDay();
    const slot = perNight.get(n.id) ?? { approved: 0, scanned: 0 };
    const a = dowAgg.get(dow)!;
    a.events.add(n.event.id);
    a.scanned += slot.scanned;
  }
  const byDow: DowBreakdown[] = [];
  for (let i = 0; i < 7; i++) {
    const a = dowAgg.get(i)!;
    byDow.push({ dow: i, label: DOW_LABELS[i], events: a.events.size, scanned: a.scanned });
  }
  const bestDow =
    byDow.filter((d) => d.events > 0).sort((a, b) =>
      b.scanned / Math.max(1, b.events) - a.scanned / Math.max(1, a.events)
    )[0] ?? null;

  // Top holders by scanned (consistency).
  const topHolders = [...perHolder.values()]
    .map((h) => ({
      name: h.name,
      scanned: h.scanned,
      events: h.nights.size,
      show_rate: h.approved === 0 ? 0 : h.scanned / h.approved,
    }))
    .sort((a, b) => {
      if (b.events !== a.events) return b.events - a.events;
      return b.scanned - a.scanned;
    })
    .slice(0, 10);

  const totalApproved = trend.reduce((s, t) => s + t.approved, 0);
  const totalScanned = trend.reduce((s, t) => s + t.scanned, 0);

  const tierTotal = [...tierAgg.values()].reduce((a, b) => a + b, 0);
  const byTier: TierBreakdown[] = [...tierAgg.entries()]
    .map(([tier, scanned]) => ({
      tier,
      scanned,
      pct: tierTotal === 0 ? 0 : scanned / tierTotal,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  return {
    trend,
    byVenue,
    byDow,
    byTier,
    totalApproved,
    totalScanned,
    showRate: totalApproved === 0 ? 0 : totalScanned / totalApproved,
    topHolders,
    bestDow,
  };
}
