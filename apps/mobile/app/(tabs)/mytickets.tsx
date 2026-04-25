import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../src/lib/supabase";

interface Ticket {
  id: string;
  full_name: string;
  status: string;
  check_in_token: string;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string };
  };
}

export default function MyTicketsScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const p = u.user?.phone ? `+${u.user.phone.replace(/^\+/, "")}` : null;
    setPhone(p);
    if (!p) {
      setTickets([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("guests")
      .select(
        "id, full_name, status, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name))"
      )
      .eq("phone", p);
    setTickets((data ?? []) as unknown as Ticket[]);
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
          My tickets
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-1">
          Tickets
        </Text>
        {phone && (
          <Text className="text-muted text-[10px] uppercase tracking-widest mb-6">
            {phone}
          </Text>
        )}

        {tickets.length === 0 && !loading && (
          <Text className="text-muted mt-6">
            Nothing here yet. RSVP to an event from Discover and your QR will land here.
          </Text>
        )}

        <View className="gap-3 mt-2">
          {tickets.map((t) => (
            <Pressable
              key={t.id}
              onPress={() =>
                router.push(`/(guest)/ticket/${t.check_in_token}`)
              }
              className="bg-s1 border border-line rounded-lg p-4 active:border-coral/60"
            >
              <Text className="text-cream font-semibold text-base">
                {t.night.event.name}
              </Text>
              <Text className="text-muted text-[10px] uppercase tracking-widest mt-2">
                {fmtDate(t.night.night_date)} · Doors {fmtTime(t.night.doors_at)}
              </Text>
              <Text
                className={`text-[10px] uppercase tracking-widest mt-2 ${
                  t.status === "approved"
                    ? "text-mint"
                    : t.status === "pending"
                    ? "text-gold"
                    : "text-muted"
                }`}
              >
                {t.status}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
