import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fmtDate } from "@wadl/shared/format";
import { supabase } from "../../../../src/lib/supabase";

interface NightLite {
  id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
}

interface Tier {
  tier: string;
  approved: number;
  checkedIn: number;
  showRate: number;
}

interface TopHolder {
  holder: string;
  scanned: number;
  approved: number;
  showRate: number;
}

interface FeedbackAgg {
  count: number;
  avg: number;
  dist: Record<1 | 2 | 3 | 4 | 5, number>;
  topTags: Array<{ tag: string; n: number }>;
  recent: Array<{ rating: number; comment: string }>;
}

/**
 * Day 29 — mobile postevent recap. Mirrors apps/web/app/owner/events/[id]/recap.
 * Reads computed stats client-side from Supabase rather than going through
 * a server action, since the mobile app talks to Supabase directly.
 */
export default function MobileRecap() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);
  const [nights, setNights] = useState<NightLite[]>([]);
  const [totalApproved, setTotalApproved] = useState(0);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [topHolders, setTopHolders] = useState<TopHolder[]>([]);
  const [feedback, setFeedback] = useState<FeedbackAgg | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select("id, name, event_nights(id, night_date, doors_at, capacity_cap)")
        .eq("id", id)
        .maybeSingle<{ id: string; name: string; event_nights: NightLite[] }>();
      if (!ev) {
        setLoading(false);
        return;
      }
      setEventName(ev.name);
      const nightsSorted = [...ev.event_nights].sort((a, b) =>
        a.doors_at < b.doors_at ? -1 : 1
      );
      setNights(nightsSorted);
      const cap = nightsSorted.reduce((s, n) => s + (n.capacity_cap ?? 0), 0);
      setCapacity(cap);

      const nightIds = nightsSorted.map((n) => n.id);
      if (nightIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: guests } = await supabase
        .from("guests")
        .select(
          "id, plus_ones, tier, status, allocation:allocations(holder_name), check_ins(state)"
        )
        .in("event_night_id", nightIds);

      type RawGuest = {
        plus_ones: number;
        tier: string;
        status: string;
        allocation: { holder_name: string } | null;
        check_ins: Array<{ state: string }>;
      };

      let approvedH = 0;
      let inH = 0;
      const tierMap = new Map<string, { approved: number; checkedIn: number }>();
      const holderMap = new Map<string, { scanned: number; approved: number }>();
      for (const g of (guests ?? []) as unknown as RawGuest[]) {
        if (g.status !== "approved") continue;
        const heads = 1 + (g.plus_ones ?? 0);
        approvedH += heads;
        const t = g.tier || "ga";
        if (!tierMap.has(t)) tierMap.set(t, { approved: 0, checkedIn: 0 });
        tierMap.get(t)!.approved += heads;
        const holder = g.allocation?.holder_name;
        if (holder) {
          if (!holderMap.has(holder)) holderMap.set(holder, { scanned: 0, approved: 0 });
          holderMap.get(holder)!.approved += heads;
        }
        const inScan = g.check_ins.find((c) => c.state === "approved");
        if (inScan) {
          inH += heads;
          tierMap.get(t)!.checkedIn += heads;
          if (holder) holderMap.get(holder)!.scanned += heads;
        }
      }
      setTotalApproved(approvedH);
      setTotalCheckedIn(inH);
      setTiers(
        [...tierMap.entries()]
          .map(([tier, v]) => ({
            tier,
            approved: v.approved,
            checkedIn: v.checkedIn,
            showRate: v.approved === 0 ? 0 : v.checkedIn / v.approved,
          }))
          .sort((a, b) => b.approved - a.approved)
      );
      setTopHolders(
        [...holderMap.entries()]
          .map(([holder, v]) => ({
            holder,
            scanned: v.scanned,
            approved: v.approved,
            showRate: v.approved === 0 ? 0 : v.scanned / v.approved,
          }))
          .sort((a, b) => b.scanned - a.scanned)
          .slice(0, 5)
      );

      // Feedback
      const { data: fb } = await supabase
        .from("event_feedback")
        .select("rating, tags, comment")
        .eq("event_id", id)
        .order("created_at", { ascending: false })
        .limit(500);
      const list =
        (fb ?? []) as Array<{ rating: number; tags: string[] | null; comment: string | null }>;
      if (list.length > 0) {
        const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const tagCounts = new Map<string, number>();
        let sum = 0;
        for (const r of list) {
          const k = r.rating as 1 | 2 | 3 | 4 | 5;
          if (k >= 1 && k <= 5) dist[k]++;
          sum += r.rating;
          for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
        setFeedback({
          count: list.length,
          avg: sum / list.length,
          dist,
          topTags: [...tagCounts.entries()]
            .map(([tag, n]) => ({ tag, n }))
            .sort((a, b) => b.n - a.n)
            .slice(0, 5),
          recent: list
            .filter((r) => r.comment && r.comment.trim().length > 0)
            .slice(0, 5)
            .map((r) => ({ rating: r.rating, comment: r.comment! })),
        });
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }

  const showRate = totalApproved === 0 ? 0 : totalCheckedIn / totalApproved;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>
        <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
          Recap
        </Text>
        <Text className="text-cream text-4xl font-black uppercase leading-[0.95] mb-2">
          {eventName ?? "—"}
        </Text>
        <Text className="text-muted text-[10px] uppercase tracking-widest mb-6">
          {nights.length === 0
            ? "No nights"
            : nights.length === 1
            ? fmtDate(nights[0].night_date)
            : `${fmtDate(nights[0].night_date)} → ${fmtDate(nights[nights.length - 1].night_date)}`}
        </Text>

        <View className="bg-s1 border border-line rounded-lg p-5 mb-3">
          <Text className="text-muted text-[10px] uppercase tracking-widest mb-1">
            Show rate
          </Text>
          <Text className="text-coral text-6xl font-black tracking-tight leading-none">
            {Math.round(showRate * 100)}%
          </Text>
          <Text className="text-muted text-sm mt-2">
            {totalCheckedIn} of {totalApproved} approved heads scanned in
          </Text>
        </View>

        {capacity > 0 && (
          <View className="bg-s1 border border-line rounded-lg p-5 mb-3">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-1">
              Capacity
            </Text>
            <Text className="text-cream text-3xl font-black">
              {totalCheckedIn}{" "}
              <Text className="text-muted text-xl">/ {capacity}</Text>
            </Text>
          </View>
        )}

        {tiers.length > 0 && (
          <View className="bg-s1 border border-line rounded-lg p-5 mb-3">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-3">
              By tier
            </Text>
            <View className="gap-2">
              {tiers.map((t) => (
                <View
                  key={t.tier}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-cream uppercase tracking-tight">
                    {t.tier}
                  </Text>
                  <Text className="text-muted text-[10px] uppercase tracking-widest">
                    {t.checkedIn}/{t.approved} · {Math.round(t.showRate * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {topHolders.length > 0 && (
          <View className="bg-s1 border border-line rounded-lg p-5 mb-3">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-3">
              Top holders
            </Text>
            <View className="gap-2">
              {topHolders.map((h, i) => (
                <View
                  key={h.holder}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-cream flex-1 mr-2" numberOfLines={1}>
                    <Text className="text-muted">{i + 1}. </Text>
                    {h.holder}
                  </Text>
                  <Text className="text-muted text-[10px] uppercase tracking-widest">
                    {h.scanned}/{h.approved} · {Math.round(h.showRate * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {feedback && feedback.count > 0 && (
          <View className="bg-s1 border border-line rounded-lg p-5 mb-3">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-3">
              Guest feedback · {feedback.count} response{feedback.count === 1 ? "" : "s"}
            </Text>
            <Text className="text-coral text-4xl font-black leading-none">
              {feedback.avg.toFixed(1)}
              <Text className="text-muted text-base"> / 5</Text>
            </Text>
            <View className="gap-1 mt-4">
              {[5, 4, 3, 2, 1].map((stars) => {
                const c = feedback.dist[stars as 1 | 2 | 3 | 4 | 5] ?? 0;
                const pct =
                  feedback.count === 0 ? 0 : (c / feedback.count) * 100;
                return (
                  <View key={stars} className="flex-row items-center gap-2">
                    <Text className="text-muted text-[10px] uppercase tracking-widest w-6">
                      {stars}★
                    </Text>
                    <View className="flex-1 h-1.5 bg-s2 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-coral rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                    <Text className="text-muted text-[10px] uppercase tracking-widest w-6 text-right">
                      {c}
                    </Text>
                  </View>
                );
              })}
            </View>
            {feedback.topTags.length > 0 && (
              <View className="flex-row flex-wrap gap-1 mt-4">
                {feedback.topTags.map((t) => (
                  <View
                    key={t.tag}
                    className="px-2 py-1 bg-s2 border border-line rounded-full"
                  >
                    <Text className="text-muted text-[10px] uppercase tracking-widest">
                      {t.tag} · {t.n}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {feedback.recent.length > 0 && (
              <View className="mt-4 gap-2">
                {feedback.recent.map((c, i) => (
                  <View key={i} className="border-l-2 border-coral pl-3 py-1">
                    <Text className="text-coral text-[10px] uppercase tracking-widest mb-1">
                      {"★".repeat(c.rating)}
                      <Text className="text-muted">
                        {"★".repeat(5 - c.rating)}
                      </Text>
                    </Text>
                    <Text className="text-cream text-sm">{c.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
