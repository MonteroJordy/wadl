import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify() {
    setErr(null);
    if (code.length < 4 || !phone) return setErr("Enter the 6-digit code.");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.replace("/(tabs)/discover");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg px-6">
      <View className="flex-1 justify-center">
        <Pressable onPress={() => router.back()} className="mb-8">
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>
        <Text className="text-cream text-4xl font-black uppercase tracking-tight mb-3">
          Enter code.
        </Text>
        <Text className="text-cream/70 text-sm">
          Sent to <Text className="text-cream">{phone}</Text>.
        </Text>

        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
          placeholder="••••••"
          placeholderTextColor="rgba(242,237,228,0.4)"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          className="bg-s2 border border-line rounded-md px-4 py-4 text-cream text-3xl mt-8 mb-4 text-center tracking-[0.5em]"
        />

        {err && <Text className="text-coral text-sm mb-3">{err}</Text>}

        <Pressable
          onPress={verify}
          disabled={loading}
          className="bg-coral rounded-md py-4 active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text className="text-bg text-center font-semibold uppercase tracking-widest text-sm">
              Verify
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
