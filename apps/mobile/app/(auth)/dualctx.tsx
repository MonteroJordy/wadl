import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../src/lib/supabase";

interface Shift {
  event_id: string;
  role: "door_staff" | "door_manager";
  event_name: string;
  doors_at: string;
  night_date: string;
  night_id: string;
}

/**
 * Day 29 — mobile dualctx context picker.
 * Mirrors apps/web/app/dualctx/page.tsx. Shown when a user signs in and
 * is BOTH an owner AND has a door_staff/door_manager shift in the next 18h.
 */
export default function MobileDualCtx() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/(auth)/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("role, account_id")
        .eq("id", u.user.id)
        .maybeSingle<{ role: string | null; account_id: string | null }>();
      setIsOwner(prof?.role === "owner" || !!prof?.account_id);

      const start = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("event_staff")
        .select(
          "event_id, role, event:events!inner(id, name, event_nights!inner(id, night_date, doors_at))"
        )
        .eq("user_id", u.user.id)
        .in("role", ["door_staff", "door_manager"])
        .gte("event.event_nights.doors_at", start)
        .lte("event.event_nights.doors_at", end);
      type Raw = {
        event_id: string;
        role: "door_staff" | "door_manager";
        event: {
          id: string;
          name: string;
          event_nights: Array<{ id: string; night_date: string; doors_at: string }>;
        };
      };
      const flat: Shift[] = ((rows ?? []) as unknown as Raw[])
        .flatMap((r) =>
          r.event.event_nights.map((n) => ({
            event_id: r.event_id,
            role: r.role,
            event_name: r.event.name,
            doors_at: n.doors_at,
            night_id: n.id,
            night_date: n.night_date,
          }))
        )
        .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));
      setShifts(flat);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }

  const primary = shifts[0];

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
          Tonight
        </Text>
        <Text className="text-cream text-4xl font-black uppercase leading-[0.95]">
          Where are you working?
        </Text>
        <Text className="text-muted text-sm mt-3 leading-relaxed">
          You&apos;re booked as both an owner and door staff. Pick the surface
          you want now — switch any time from your profile.
        </Text>
      </View>

      <View className="px-6 gap-3">
        {isOwner && (
          <Pressable
            onPress={() => router.replace("/(tabs)/dashboard")}
            className="bg-s1 border border-line rounded-lg p-5 active:border-coral/60"
          >
            <Text className="text-coral text-[10px] uppercase tracking-widest mb-1">
              Owner
            </Text>
            <Text className="text-cream text-2xl font-black uppercase tracking-tight">
              Run the show
            </Text>
            <Text className="text-muted text-sm mt-2">
              Approvals, allocations, capacity, analytics. Full access.
            </Text>
          </Pressable>
        )}

        {primary && (
          <Pressable
            onPress={() => router.replace("/(door)/scan")}
            className="bg-s1 border border-line rounded-lg p-5 active:border-mint/60"
          >
            <Text className="text-mint text-[10px] uppercase tracking-widest mb-1">
              {primary.role === "door_manager" ? "Door manager" : "Door staff"}
            </Text>
            <Text className="text-cream text-2xl font-black uppercase tracking-tight">
              Work the door
            </Text>
            <Text className="text-muted text-sm mt-2">
              {primary.event_name} · {fmtDate(primary.night_date)} · doors{" "}
              {fmtTime(primary.doors_at)}
            </Text>
            {shifts.length > 1 && (
              <Text className="text-mint text-[10px] uppercase tracking-widest mt-2">
                + {shifts.length - 1} more shift{shifts.length === 2 ? "" : "s"} tonight
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace("/(tabs)/mytickets")}
          className="bg-s1 border border-line rounded-lg p-5 active:border-lav/60"
        >
          <Text className="text-lav text-[10px] uppercase tracking-widest mb-1">
            Guest
          </Text>
          <Text className="text-cream text-2xl font-black uppercase tracking-tight">
            My tickets
          </Text>
          <Text className="text-muted text-sm mt-2">
            View your own RSVPs and QRs.
          </Text>
        </Pressable>
      </View>

      <Text className="text-muted text-[10px] uppercase tracking-widest text-center mt-8 px-6">
        Pick once · switch via profile later
      </Text>
    </SafeAreaView>
  );
}
