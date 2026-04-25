import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../src/lib/supabase";

interface DiscoverNight {
  id: string;
  night_date: string;
  doors_at: string;
  is_frozen: boolean;
  event: { id: string; name: string; flyer_url: string | null };
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [nights, setNights] = useState<DiscoverNight[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("event_nights")
      .select(
        "id, night_date, doors_at, is_frozen, event:events!inner(id, name, flyer_url)"
      )
      .gte("doors_at", new Date().toISOString())
      .order("doors_at", { ascending: true })
      .limit(50);
    setNights(((data ?? []) as unknown as DiscoverNight[]).filter((n) => !n.is_frozen));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl tintColor="#FF4A2B" refreshing={loading} onRefresh={load} />
        }
      >
        <Text className="text-coral text-[10px] uppercase tracking-widest mb-2">
          Tonight + upcoming
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-6">
          Discover
        </Text>

        {nights.length === 0 && !loading && (
          <Text className="text-muted">Nothing on right now. Check back soon.</Text>
        )}

        <View className="gap-3">
          {nights.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(`/(guest)/event/${n.event.id}`)}
              className="bg-s1 border border-line rounded-lg p-4 active:border-coral/60"
            >
              <Text className="text-cream font-semibold text-base">
                {n.event.name}
              </Text>
              <Text className="text-muted text-[10px] uppercase tracking-widest mt-2">
                {fmtDate(n.night_date)} · Doors {fmtTime(n.doors_at)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
