import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../../src/lib/supabase";

interface Pending {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  created_at: string;
  allocation: { holder_name: string } | null;
  night: { night_date: string; doors_at: string };
}

export default function MobileQueueScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [eventName, setEventName] = useState("");
  const [rows, setRows] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!eventId) return;
    setLoading(true);
    const { data: ev } = await supabase
      .from("events")
      .select("id, name, event_nights(id)")
      .eq("id", eventId)
      .maybeSingle<{ id: string; name: string; event_nights: { id: string }[] }>();
    setEventName(ev?.name ?? "");
    const nightIds = (ev?.event_nights ?? []).map((n) => n.id);
    if (nightIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("guests")
      .select(
        "id, full_name, plus_ones, tier, created_at, allocation:allocations(holder_name), night:event_nights!inner(night_date, doors_at)"
      )
      .in("event_night_id", nightIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Pending[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function decide(id: string, status: "approved" | "rejected") {
    await supabase
      .from("guests")
      .update({
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-6 pt-6 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>
        <Text className="text-coral text-[10px] uppercase tracking-widest">
          {rows.length} pending
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor="#FF4A2B"
            refreshing={loading}
            onRefresh={load}
          />
        }
      >
        <Text className="text-coral text-[10px] uppercase tracking-widest mb-2">
          Approval queue
        </Text>
        <Text className="text-cream text-4xl font-black uppercase tracking-tight mb-6">
          {eventName}
        </Text>

        {rows.length === 0 && !loading && (
          <Text className="text-muted">Queue is clear.</Text>
        )}

        <View className="gap-3">
          {rows.map((r) => (
            <View
              key={r.id}
              className="bg-s1 border border-line rounded-lg p-4"
            >
              <Text className="text-cream font-semibold text-base">
                {r.full_name}
                {r.plus_ones > 0 && (
                  <Text className="text-muted"> +{r.plus_ones}</Text>
                )}
              </Text>
              <Text className="text-muted text-[10px] uppercase tracking-widest mt-2">
                {r.tier.toUpperCase()} ·{" "}
                {r.allocation?.holder_name ?? "Walk-up"} ·{" "}
                {fmtDate(r.night.night_date)} {fmtTime(r.night.doors_at)}
              </Text>
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={() => decide(r.id, "rejected")}
                  className="flex-1 border border-coral/60 rounded py-3 active:opacity-70"
                >
                  <Text className="text-coral text-center text-xs uppercase tracking-widest font-semibold">
                    Reject
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => decide(r.id, "approved")}
                  className="flex-1 bg-mint rounded py-3 active:opacity-80"
                >
                  <Text className="text-bg text-center text-xs uppercase tracking-widest font-semibold">
                    Approve
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
