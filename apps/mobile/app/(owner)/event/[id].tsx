import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../../src/lib/supabase";

interface Detail {
  id: string;
  name: string;
  event_nights: Array<{
    id: string;
    night_date: string;
    doors_at: string;
    capacity_cap: number | null;
    is_frozen: boolean;
  }>;
}

export default function OwnerEventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Detail | null>(null);
  const [counts, setCounts] = useState<{ approved: number; pending: number; scanned: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events")
        .select(
          "id, name, event_nights(id, night_date, doors_at, capacity_cap, is_frozen)"
        )
        .eq("id", id)
        .maybeSingle<Detail>();
      setEvent(ev ?? null);

      if (ev) {
        const upcomingNight =
          [...ev.event_nights].sort((a, b) =>
            a.doors_at < b.doors_at ? -1 : 1
          )[0];
        if (upcomingNight) {
          const [g, c] = await Promise.all([
            supabase
              .from("guests")
              .select("status, plus_ones")
              .eq("event_night_id", upcomingNight.id),
            supabase
              .from("check_ins")
              .select("state")
              .eq("event_night_id", upcomingNight.id),
          ]);
          let approved = 0;
          let pending = 0;
          for (const row of (g.data ?? []) as Array<{
            status: string;
            plus_ones: number;
          }>) {
            const heads = 1 + (row.plus_ones ?? 0);
            if (row.status === "approved") approved += heads;
            else if (row.status === "pending") pending += heads;
          }
          let scanned = 0;
          for (const row of (c.data ?? []) as Array<{ state: string }>) {
            if (row.state === "approved") scanned += 1;
          }
          setCounts({ approved, pending, scanned });
        }
      }
    })();
  }, [id]);

  if (!event) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }

  const next = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  )[0];

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>

        <Text className="text-cream text-4xl font-black uppercase mb-1">
          {event.name}
        </Text>
        {next && (
          <Text className="text-muted text-[10px] uppercase tracking-widest mb-6">
            {fmtDate(next.night_date)} · Doors {fmtTime(next.doors_at)}
          </Text>
        )}

        {counts && (
          <View className="bg-s1 border border-line rounded-lg p-4 mb-4">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-3">
              Tonight
            </Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-cream text-3xl font-black">
                  {counts.scanned}
                </Text>
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  Scanned
                </Text>
              </View>
              <View>
                <Text className="text-cream text-3xl font-black">
                  {counts.approved}
                </Text>
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  Approved
                </Text>
              </View>
              <View>
                <Text className="text-gold text-3xl font-black">
                  {counts.pending}
                </Text>
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  Pending
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="gap-2 mt-2">
          <Pressable
            onPress={() => router.push("/(door)/scan")}
            className="bg-mint rounded-md py-4 active:opacity-80"
          >
            <Text className="text-bg text-center font-semibold uppercase tracking-widest text-sm">
              Open scanner
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/(owner)/queue/${event.id}`)}
            className="border border-coral/60 rounded-md py-3 active:opacity-80"
          >
            <Text className="text-coral text-center font-semibold uppercase tracking-widest text-xs">
              Approval queue
              {counts && counts.pending > 0 ? ` · ${counts.pending}` : ""}
            </Text>
          </Pressable>
        </View>

        <Text className="text-muted text-xs leading-5 mt-6">
          Allocations, broadcasts, scorecards live in the web app at
          wadl-pearl.vercel.app — open on a laptop for full control.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
