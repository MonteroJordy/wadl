import { createAdminClient } from "@/lib/supabase/admin";

export interface TierStat {
  tier: string;
  approved: number;
  checkedIn: number;
  showRate: number; // 0..1
}

export interface TopHolder {
  allocation_id: string;
  holder_name: string;
  scanned: number;
  approved: number;
  showRate: number;
}

export interface HourBucket {
  hour: number; // 0..23 local
  count: number;
}

export interface NoShow {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  allocation_name: string | null;
}

export interface RecapData {
  totalApproved: number;      // sum of 1 + plus_ones
  totalCheckedIn: number;     // count of approved check_ins
  showRate: number;           // 0..1
  capacity: number;
  tiers: TierStat[];
  hourBuckets: HourBucket[];
  peakHour: HourBucket | null;
  topHolders: TopHolder[];
  noShows: NoShow[];
  firstCheckInAt: string | null;
  lastCheckInAt: string | null;
}

interface RawGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  allocation_id: string | null;
  allocation: { holder_name: string } | null;
  check_ins: Array<{ state: string; scanned_at: string }>;
}

/**
 * Compute a recap for an event-scope (all nights of the event) or a
 * specific night. Uses the service-role admin client (RLS on guests is
 * owner-scoped; the caller must authorize before invoking).
 */
export async function computeRecap(
  eventId: string,
  nightId?: string
): Promise<RecapData> {
  const admin = createAdminClient();

  // Target night ids.
  const { data: nightRows } = await admin
    .from("event_nights")
    .select("id, capacity_cap")
    .eq("event_id", eventId);
  const nights = (nightRows ?? []) as Array<{
    id: string;
    capacity_cap: number | null;
  }>;
  const scopedNightIds = nightId ? [nightId] : nights.map((n) => n.id);

  if (scopedNightIds.length === 0) return emptyRecap();

  const capacity = (nightId
    ? nights.find((n) => n.id === nightId)?.capacity_cap ?? 0
    : nights.reduce((s, n) => s + (n.capacity_cap ?? 0), 0)) as number;

  const { data: guestRows } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, tier, status, allocation_id, allocation:allocations(holder_name), check_ins(state, scanned_at)"
    )
    .in("event_night_id", scopedNightIds);

  const guests = (guestRows ?? []) as unknown as RawGuest[];
  const approved = guests.filter((g) => g.status === "approved");

  let totalApproved = 0;
  let totalCheckedIn = 0;
  const tierMap = new Map<
    string,
    { approved: number; checkedIn: number }
  >();
  const holderMap = new Map<
    string,
    { holder_name: string; allocation_id: string; approved: number; scanned: number }
  >();
  const hourCounts = new Map<number, number>();
  const noShows: NoShow[] = [];
  let firstCheckInAt: string | null = null;
  let lastCheckInAt: string | null = null;

  for (const g of approved) {
    const headcount = 1 + (g.plus_ones ?? 0);
    totalApproved += headcount;

    const tier = g.tier || "ga";
    if (!tierMap.has(tier)) tierMap.set(tier, { approved: 0, checkedIn: 0 });
    tierMap.get(tier)!.approved += headcount;

    if (g.allocation_id) {
      if (!holderMap.has(g.allocation_id)) {
        holderMap.set(g.allocation_id, {
          holder_name: g.allocation?.holder_name ?? "—",
          allocation_id: g.allocation_id,
          approved: 0,
          scanned: 0,
        });
      }
      holderMap.get(g.allocation_id)!.approved += headcount;
    }

    const inScan = g.check_ins.find((c) => c.state === "approved");
    if (inScan) {
      totalCheckedIn += headcount;
      tierMap.get(tier)!.checkedIn += headcount;
      if (g.allocation_id) {
        holderMap.get(g.allocation_id)!.scanned += headcount;
      }
      const d = new Date(inScan.scanned_at);
      const hour = d.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + headcount);
      if (!firstCheckInAt || inScan.scanned_at < firstCheckInAt) {
        firstCheckInAt = inScan.scanned_at;
      }
      if (!lastCheckInAt || inScan.scanned_at > lastCheckInAt) {
        lastCheckInAt = inScan.scanned_at;
      }
    } else {
      noShows.push({
        id: g.id,
        full_name: g.full_name,
        plus_ones: g.plus_ones,
        tier,
        allocation_name: g.allocation?.holder_name ?? null,
      });
    }
  }

  const tiers: TierStat[] = [...tierMap.entries()]
    .map(([tier, v]) => ({
      tier,
      approved: v.approved,
      checkedIn: v.checkedIn,
      showRate: v.approved === 0 ? 0 : v.checkedIn / v.approved,
    }))
    .sort((a, b) => b.approved - a.approved);

  const hourBuckets: HourBucket[] = [...hourCounts.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);
  const peakHour =
    hourBuckets.length === 0
      ? null
      : hourBuckets.reduce((p, h) => (h.count > p.count ? h : p), hourBuckets[0]);

  const topHolders: TopHolder[] = [...holderMap.values()]
    .map((h) => ({
      allocation_id: h.allocation_id,
      holder_name: h.holder_name,
      scanned: h.scanned,
      approved: h.approved,
      showRate: h.approved === 0 ? 0 : h.scanned / h.approved,
    }))
    .sort((a, b) => b.scanned - a.scanned);

  noShows.sort((a, b) => a.full_name.localeCompare(b.full_name));

  return {
    totalApproved,
    totalCheckedIn,
    showRate: totalApproved === 0 ? 0 : totalCheckedIn / totalApproved,
    capacity,
    tiers,
    hourBuckets,
    peakHour,
    topHolders,
    noShows,
    firstCheckInAt,
    lastCheckInAt,
  };
}

function emptyRecap(): RecapData {
  return {
    totalApproved: 0,
    totalCheckedIn: 0,
    showRate: 0,
    capacity: 0,
    tiers: [],
    hourBuckets: [],
    peakHour: null,
    topHolders: [],
    noShows: [],
    firstCheckInAt: null,
    lastCheckInAt: null,
  };
}

// ============================================================================
// Day 26: Feedback aggregation. Surfaced inside the existing recap page.
// ============================================================================

export interface FeedbackTagCount {
  tag: string;
  count: number;
}

export interface FeedbackComment {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface FeedbackAggregate {
  responseCount: number;
  averageRating: number; // 0..5
  ratingDist: Record<1 | 2 | 3 | 4 | 5, number>;
  topTags: FeedbackTagCount[];
  recentComments: FeedbackComment[]; // last 10 with comment != null
}

export async function computeFeedback(
  eventId: string
): Promise<FeedbackAggregate> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("event_feedback")
    .select("id, rating, tags, comment, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(500);

  const list =
    (rows ?? []) as Array<{
      id: string;
      rating: number;
      tags: string[] | null;
      comment: string | null;
      created_at: string;
    }>;

  const dist: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };
  const tagCounts = new Map<string, number>();
  let sum = 0;

  for (const r of list) {
    const rk = (r.rating as 1 | 2 | 3 | 4 | 5);
    if (rk >= 1 && rk <= 5) dist[rk]++;
    sum += r.rating;
    for (const t of r.tags ?? []) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }

  const topTags: FeedbackTagCount[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentComments: FeedbackComment[] = list
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment!,
      created_at: r.created_at,
    }));

  return {
    responseCount: list.length,
    averageRating: list.length === 0 ? 0 : sum / list.length,
    ratingDist: dist,
    topTags,
    recentComments,
  };
}

export function fmtHour(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d
    .toLocaleTimeString("en-US", { hour: "numeric" })
    .toLowerCase()
    .replace(" ", "");
}
