import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../../src/lib/supabase";

interface EventDetail {
  id: string;
  name: string;
  description: string | null;
  event_nights: Array<{
    id: string;
    night_date: string;
    doors_at: string;
    is_frozen: boolean;
  }>;
  venue: { name: string | null; city: string | null } | null;
}

export default function GuestEventDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select(
          "id, name, description, event_nights(id, night_date, doors_at, is_frozen), venue:venues(name, city)"
        )
        .eq("id", id)
        .maybeSingle<EventDetail>();
      setEvent(data ?? null);
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

  if (!event) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-cream text-2xl uppercase">Event not found.</Text>
      </SafeAreaView>
    );
  }

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );
  const upcoming = nights.filter(
    (n) => new Date(n.doors_at).getTime() >= Date.now() - 2 * 60 * 60_000
  );
  const showNights = upcoming.length > 0 ? upcoming : nights;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>

        <Text className="text-cream text-4xl font-black uppercase tracking-tight mb-3">
          {event.name}
        </Text>

        {event.venue?.name && (
          <View className="mb-4">
            <Text className="text-muted text-[10px] uppercase tracking-widest">
              Venue
            </Text>
            <Text className="text-cream">{event.venue.name}</Text>
          </View>
        )}

        {event.description && (
          <Text className="text-cream/80 leading-6 mb-6">
            {event.description}
          </Text>
        )}

        <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
          {upcoming.length > 0 ? "Upcoming nights" : "All nights"}
        </Text>

        <View className="gap-3">
          {showNights.map((n) => (
            <View
              key={n.id}
              className="bg-s1 border border-line rounded-lg p-4 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-cream font-semibold">
                  {fmtDate(n.night_date)}
                </Text>
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  Doors {fmtTime(n.doors_at)}
                  {n.is_frozen ? " · CLOSED" : ""}
                </Text>
              </View>
              {!n.is_frozen ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: `/(guest)/event/${event.id}/rsvp`,
                      params: { night: n.id },
                    })
                  }
                  className="bg-coral rounded-md px-4 py-3 active:opacity-80"
                >
                  <Text className="text-bg font-semibold uppercase tracking-widest text-xs">
                    RSVP
                  </Text>
                </Pressable>
              ) : (
                <Text className="text-muted text-[10px] uppercase tracking-widest">
                  Closed
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
