import { createAdminClient } from "@/lib/supabase/admin";

export interface HolderScorecard {
  key: string; // lowercased holder name (joiner across events)
  display_name: string;
  approved: number;
  scanned: number;
  show_rate: number; // 0..1
  grade: "A" | "B" | "C" | "D";
  trend: "up" | "down" | "flat" | null;
  events_played: number;
  tier_mix: { ga: number; vip: number; all_access: number };
}

interface AllocRow {
  id: string;
  holder_name: string;
  event_night_id: string;
  event_night: { event_id: string; doors_at: string };
}

interface GuestRow {
  allocation_id: string | null;
  plus_ones: number;
  status: string;
  tier: string;
  check_ins: Array<{ state: string }>;
}

function gradeFor(showRate: number): "A" | "B" | "C" | "D" {
  if (showRate >= 0.9) return "A";
  if (showRate >= 0.75) return "B";
  if (showRate >= 0.6) return "C";
  return "D";
}

function trendOf(latest: number, prior: number | null): "up" | "down" | "flat" | null {
  if (prior === null) return null;
  if (latest > prior + 0.05) return "up";
  if (latest < prior - 0.05) return "down";
  return "flat";
}

/**
 * Compute scorecards for an account. If `eventId` is set, scopes to that event.
 * Holders aggregate by lower-cased name; trend compares the holder's latest
 * event show rate to the immediately prior event.
 */
export async function computeScorecards(
  accountId: string,
  eventId?: string
): Promise<HolderScorecard[]> {
  const admin = createAdminClient();

  // Allocations for relevant events.
  let allocQ = admin
    .from("allocations")
    .select(
      "id, holder_name, event_night_id, event_night:event_nights!inner(event_id, doors_at, event:events!inner(account_id))"
    )
    .eq("event_night.event.account_id", accountId);
  if (eventId) {
    allocQ = allocQ.eq("event_night.event_id", eventId);
  }
  const { data: allocsRaw } = await allocQ;

  const allocs = ((allocsRaw ?? []) as unknown as Array<
    AllocRow & {
      event_night: { event_id: string; doors_at: string; event: unknown };
    }
  >).map((a) => ({
    id: a.id,
    holder_name: a.holder_name,
    event_night_id: a.event_night_id,
    event_id: a.event_night.event_id,
    doors_at: a.event_night.doors_at,
  }));

  if (allocs.length === 0) return [];

  // Guests + check_ins for these allocations.
  const allocIds = allocs.map((a) => a.id);
  const { data: guestsRaw } = await admin
    .from("guests")
    .select("allocation_id, plus_ones, status, tier, check_ins(state)")
    .in("allocation_id", allocIds);
  const guests = (guestsRaw ?? []) as unknown as GuestRow[];

  // Per-allocation aggregates.
  interface AllocAgg {
    approved: number;
    scanned: number;
    tiers: { ga: number; vip: number; all_access: number };
  }
  const allocAgg = new Map<string, AllocAgg>();
  for (const a of allocs) {
    allocAgg.set(a.id, {
      approved: 0,
      scanned: 0,
      tiers: { ga: 0, vip: 0, all_access: 0 },
    });
  }
  for (const g of guests) {
    if (!g.allocation_id || !allocAgg.has(g.allocation_id)) continue;
    if (g.status !== "approved") continue;
    const heads = 1 + (g.plus_ones ?? 0);
    const agg = allocAgg.get(g.allocation_id)!;
    agg.approved += heads;
    if (g.check_ins.some((c) => c.state === "approved")) {
      agg.scanned += heads;
    }
    const tier = g.tier in agg.tiers ? (g.tier as keyof typeof agg.tiers) : "ga";
    agg.tiers[tier] += heads;
  }

  // Group by holder (case-insensitive).
  interface HolderAgg {
    display_name: string;
    approved: number;
    scanned: number;
    tiers: { ga: number; vip: number; all_access: number };
    perEvent: Map<string, { approved: number; scanned: number; doors_at: string }>;
  }
  const byKey = new Map<string, HolderAgg>();

  for (const a of allocs) {
    const key = a.holder_name.toLowerCase().trim();
    if (!byKey.has(key)) {
      byKey.set(key, {
        display_name: a.holder_name,
        approved: 0,
        scanned: 0,
        tiers: { ga: 0, vip: 0, all_access: 0 },
        perEvent: new Map(),
      });
    }
    const ha = byKey.get(key)!;
    const agg = allocAgg.get(a.id);
    if (!agg) continue;

    ha.approved += agg.approved;
    ha.scanned += agg.scanned;
    ha.tiers.ga += agg.tiers.ga;
    ha.tiers.vip += agg.tiers.vip;
    ha.tiers.all_access += agg.tiers.all_access;

    const ev = ha.perEvent.get(a.event_id);
    if (ev) {
      ev.approved += agg.approved;
      ev.scanned += agg.scanned;
      // keep the latest doors_at as the event timestamp
      if (a.doors_at > ev.doors_at) ev.doors_at = a.doors_at;
    } else {
      ha.perEvent.set(a.event_id, {
        approved: agg.approved,
        scanned: agg.scanned,
        doors_at: a.doors_at,
      });
    }
  }

  const cards: HolderScorecard[] = [];
  for (const [key, ha] of byKey.entries()) {
    const showRate = ha.approved === 0 ? 0 : ha.scanned / ha.approved;
    const events = [...ha.perEvent.values()].sort((a, b) =>
      a.doors_at < b.doors_at ? 1 : -1
    );
    const latestRate = events[0]
      ? events[0].approved === 0
        ? 0
        : events[0].scanned / events[0].approved
      : 0;
    const priorRate = events[1]
      ? events[1].approved === 0
        ? 0
        : events[1].scanned / events[1].approved
      : null;
    cards.push({
      key,
      display_name: ha.display_name,
      approved: ha.approved,
      scanned: ha.scanned,
      show_rate: showRate,
      grade: gradeFor(showRate),
      trend: events.length >= 2 ? trendOf(latestRate, priorRate) : null,
      events_played: ha.perEvent.size,
      tier_mix: ha.tiers,
    });
  }

  // Sort by show rate desc, then approved volume desc.
  cards.sort((a, b) => {
    if (Math.abs(a.show_rate - b.show_rate) > 0.001) {
      return b.show_rate - a.show_rate;
    }
    return b.approved - a.approved;
  });

  return cards;
}
