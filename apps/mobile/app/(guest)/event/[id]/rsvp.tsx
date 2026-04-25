import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../../src/lib/supabase";

/**
 * Mobile RSVP. Calls the same admin-side `/api/embed/[eventId]` is NOT used
 * here because we have an authed user. We simulate the same insert via the
 * Supabase client (RLS allows the guest to insert their own row in the
 * walk-up allocation when phone-verified). For simplicity in this scaffold
 * we POST through a generic /api/mobile/rsvp endpoint on the web — see the
 * `wadlServer` helper. Until that's wired, this screen surfaces a dev hint.
 */
const WEB_BASE =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://wadl-pearl.vercel.app";

export default function GuestRsvp() {
  const router = useRouter();
  const { id, night } = useLocalSearchParams<{ id: string; night: string }>();
  const [name, setName] = useState("");
  const [plus, setPlus] = useState("0");
  const [smsConsent, setSmsConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string } | null>(null);

  async function submit() {
    setErr(null);
    if (!name.trim()) return setErr("Enter your name.");
    if (!smsConsent) return setErr("SMS consent is required for your QR.");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const phone = u.user?.phone ? `+${u.user.phone.replace(/^\+/, "")}` : null;
      if (!phone) {
        setErr("Sign in by phone first.");
        return;
      }
      // Insert directly via Supabase (matches the web walk-up flow). The
      // server checks list_open + cap.
      // 1. Find or create walk-up allocation.
      const { data: alloc } = await supabase
        .from("allocations")
        .select("id, list_open, plus_ones_allowed, cap")
        .eq("event_night_id", night)
        .eq("holder_name", "Walk-up")
        .maybeSingle();
      if (!alloc) {
        setErr("Walk-up list isn't open. Use the web form to RSVP.");
        return;
      }
      if (!alloc.list_open) {
        setErr("Walk-up list is closed.");
        return;
      }
      const plusOnes = alloc.plus_ones_allowed
        ? Math.max(0, parseInt(plus, 10) || 0)
        : 0;
      const { data: inserted, error } = await supabase
        .from("guests")
        .insert({
          event_night_id: night,
          allocation_id: alloc.id,
          full_name: name.trim(),
          phone,
          plus_ones: plusOnes,
          status: "pending",
          phone_verified_at: new Date().toISOString(),
        })
        .select("check_in_token")
        .single();
      if (error || !inserted?.check_in_token) {
        setErr(error?.message ?? "Could not create ticket.");
        return;
      }
      setDone({ token: inserted.check_in_token });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-bg px-6">
        <View className="flex-1 justify-center items-center">
          <Text className="text-mint text-[10px] uppercase tracking-widest mb-2">
            You&apos;re on
          </Text>
          <Text className="text-cream text-4xl font-black uppercase mb-6 text-center">
            Sent for review.
          </Text>
          <Pressable
            onPress={() => router.replace(`/(guest)/ticket/${done.token}`)}
            className="bg-coral rounded-md px-8 py-4 active:opacity-80"
          >
            <Text className="text-bg font-semibold uppercase tracking-widest text-sm">
              See your QR
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg px-6">
      <Pressable onPress={() => router.back()} className="my-4">
        <Text className="text-muted text-[10px] uppercase tracking-widest">
          ← Back
        </Text>
      </Pressable>
      <Text className="text-cream text-4xl font-black uppercase mb-6">
        Get on.
      </Text>

      <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
        Full name
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        placeholderTextColor="rgba(242,237,228,0.4)"
        className="bg-s2 border border-line rounded-md px-4 py-4 text-cream text-base mb-4"
      />

      <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
        +1s
      </Text>
      <TextInput
        value={plus}
        onChangeText={(v) => setPlus(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        className="bg-s2 border border-line rounded-md px-4 py-4 text-cream text-base mb-4"
      />

      <View className="flex-row items-center gap-3 mb-6">
        <Switch
          value={smsConsent}
          onValueChange={setSmsConsent}
          trackColor={{ false: "#222", true: "#FF4A2B" }}
          thumbColor="#F2EDE4"
        />
        <Text className="text-cream/80 flex-1 text-xs leading-5">
          I consent to receive SMS from WADL about my ticket. Reply STOP to opt out.
        </Text>
      </View>

      {err && <Text className="text-coral text-sm mb-3">{err}</Text>}

      <Pressable
        onPress={submit}
        disabled={loading}
        className="bg-coral rounded-md py-4 active:opacity-80"
      >
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text className="text-bg text-center font-semibold uppercase tracking-widest text-sm">
            RSVP
          </Text>
        )}
      </Pressable>

      <Text className="text-muted text-[10px] uppercase tracking-widest mt-6 text-center">
        Need a holder list? Open the link your host sent in {WEB_BASE.replace(/^https?:\/\//, "")}.
      </Text>
    </SafeAreaView>
  );
}
