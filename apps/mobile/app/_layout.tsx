import "../global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { registerForPushNotifications } from "../src/lib/push";
import type { Session } from "@supabase/supabase-js";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }
    if (session && inAuth) {
      // Day 29: role-aware landing — avoids dumping owners on the guest tab.
      (async () => {
        const userId = session.user.id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("role, account_id")
          .eq("id", userId)
          .maybeSingle<{ role: string | null; account_id: string | null }>();
        // Door shift in the next 18h?
        const horizonStart = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
        const horizonEnd = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
        const { data: shifts } = await supabase
          .from("event_staff")
          .select("event_id, role, event:events!inner(event_nights!inner(doors_at))")
          .eq("user_id", userId)
          .in("role", ["door_staff", "door_manager"])
          .gte("event.event_nights.doors_at", horizonStart)
          .lte("event.event_nights.doors_at", horizonEnd)
          .limit(1);
        const hasShiftTonight = (shifts ?? []).length > 0;
        const isOwner = prof?.role === "owner" || !!prof?.account_id;
        if (isOwner && hasShiftTonight) {
          router.replace("/(auth)/dualctx");
          return;
        }
        if (isOwner) {
          router.replace("/(tabs)/dashboard");
          return;
        }
        if (hasShiftTonight) {
          router.replace("/(door)/scan");
          return;
        }
        router.replace("/(tabs)/discover");
      })();
    }
  }, [session, ready, segments, router]);

  // Register push token once we have a session. Best-effort.
  useEffect(() => {
    if (!session) return;
    registerForPushNotifications().catch(() => {
      /* no-op */
    });
  }, [session]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0a0a0a" },
            animation: "fade",
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
