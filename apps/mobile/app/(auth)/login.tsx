import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { normalizePhone } from "@wadl/shared/routing";
import { supabase } from "../../src/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setErr(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setErr("Enter a valid phone number.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push({ pathname: "/(auth)/otp", params: { phone: e164 } });
  }

  return (
    <SafeAreaView className="flex-1 bg-bg px-6">
      <View className="flex-1 justify-center">
        <Text className="text-coral text-xs tracking-widest uppercase mb-3">
          WADL
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-2">
          Door,{"\n"}handled.
        </Text>
        <Text className="text-cream/70 text-sm leading-6 mt-4 mb-10">
          One list. One QR. Every guest attributed.
        </Text>

        <Text className="text-muted text-[10px] uppercase tracking-widest mb-2">
          Phone
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="(305) 799 0518"
          placeholderTextColor="rgba(242,237,228,0.4)"
          keyboardType="phone-pad"
          autoComplete="tel"
          className="bg-s2 border border-line rounded-md px-4 py-4 text-cream text-base mb-4"
        />

        {err && <Text className="text-coral text-sm mb-3">{err}</Text>}

        <Pressable
          onPress={send}
          disabled={loading}
          className="bg-coral rounded-md py-4 active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text className="text-bg text-center font-semibold uppercase tracking-widest text-sm">
              Send code
            </Text>
          )}
        </Pressable>
      </View>
      <Text className="text-muted text-[10px] uppercase tracking-widest text-center pb-4">
        By continuing you agree to the door rules.
      </Text>
    </SafeAreaView>
  );
}
