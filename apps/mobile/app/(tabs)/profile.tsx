import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { supabase } from "../../src/lib/supabase";

const WEB_URL =
  (Constants.expoConfig?.extra as { webUrl?: string })?.webUrl ??
  process.env.EXPO_PUBLIC_WEB_URL ??
  "https://wadl-pearl.vercel.app";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", u.user.id)
        .maybeSingle();
      setProfile(data ?? null);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg px-6">
      <View className="flex-1">
        <Text className="text-coral text-[10px] uppercase tracking-widest mt-6 mb-2">
          Profile
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-2">
          {profile?.full_name ?? "Guest"}
        </Text>
        <Text className="text-muted text-[10px] uppercase tracking-widest">
          {profile?.phone ?? "—"}
        </Text>
        {profile?.email && (
          <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
            {profile.email}
          </Text>
        )}
      </View>
      <View className="gap-2 mb-6">
        {/* Day 34 — explicit "during-the-night only" framing. */}
        <View className="bg-s1 border border-line rounded-md p-4 mb-2">
          <Text className="text-coral text-[10px] uppercase tracking-widest mb-2">
            Mobile = at the door
          </Text>
          <Text className="text-cream/80 text-sm leading-relaxed">
            Allocations, scorecards, settings, broadcasts, billing — they all
            live on the web. Mobile is the door tool: scan, search, escalate,
            recap.
          </Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL(`${WEB_URL}/owner`)}
          className="bg-s1 border border-line rounded-md py-3 active:opacity-80"
        >
          <Text className="text-cream text-center font-semibold uppercase tracking-widest text-xs">
            Open web dashboard ↗
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`${WEB_URL}/help`)}
          className="bg-s1 border border-line rounded-md py-3 active:opacity-80"
        >
          <Text className="text-cream text-center font-semibold uppercase tracking-widest text-xs">
            Help ↗
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/dualctx")}
          className="bg-s1 border border-line rounded-md py-3 active:opacity-80"
        >
          <Text className="text-cream text-center font-semibold uppercase tracking-widest text-xs">
            Switch role
          </Text>
        </Pressable>
        <Pressable
          onPress={signOut}
          className="bg-s1 border border-coral/40 rounded-md py-4 active:opacity-80"
        >
          <Text className="text-coral text-center font-semibold uppercase tracking-widest text-sm">
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
