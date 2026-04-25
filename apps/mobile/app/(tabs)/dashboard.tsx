import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../src/lib/supabase";

interface OwnedNight {
  id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
  is_frozen: boolean;
  event: { id: string; name: string; account_id: string };
}

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const [nights, setNights] = useState<OwnedNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("account_id, accounts(display_name)")
      .eq("id", u.user.id)
      .maybeSingle<{ account_id: string | null; accounts: { display_name: string } | null }>();
    setAccountName(prof?.accounts?.display_name ?? null);
    if (!prof?.account_id) {
      setNights([]);
      setLoading(false);
      return;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    const { data } = await supabase
      .from("event_nights")
      .select(
        "id, night_date, doors_at, capacity_cap, is_frozen, event:events!inner(id, name, account_id)"
      )
      .gte("doors_at", start.toISOString())
      .lte("doors_at", end.toISOString())
      .order("doors_at", { ascending: true });
    setNights(
      ((data ?? []) as unknown as OwnedNight[]).filter(
        (n) => n.event.account_id === prof.account_id
      )
    );
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
          Door · 2 weeks
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-1">
          {accountName ?? "Owner"}
        </Text>

        {nights.length === 0 && !loading && (
          <Text className="text-muted mt-6">
            No upcoming nights. Use the web app to create an event.
          </Text>
        )}

        <Pressable
          onPress={() => router.push("/(door)/scan")}
          className="bg-mint rounded-md py-4 mt-6 active:opacity-80"
        >
          <Text className="text-bg text-center font-semibold uppercase tracking-widest text-sm">
            Open scanner
          </Text>
        </Pressable>

        <View className="gap-3 mt-6">
          {nights.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(`/(owner)/event/${n.event.id}`)}
              className="bg-s1 border border-line rounded-lg p-4 active:border-coral/60"
            >
              <Text className="text-cream font-semibold text-base">
                {n.event.name}
              </Text>
              <Text className="text-muted text-[10px] uppercase tracking-widest mt-2">
                {fmtDate(n.night_date)} · Doors {fmtTime(n.doors_at)}
                {n.is_frozen ? " · FROZEN" : ""}
              </Text>
              {n.capacity_cap != null && (
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  cap {n.capacity_cap}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
