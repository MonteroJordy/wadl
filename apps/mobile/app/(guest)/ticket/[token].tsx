import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../../src/lib/supabase";

interface Ticket {
  full_name: string;
  status: string;
  plus_ones: number;
  check_in_token: string;
  night: {
    night_date: string;
    doors_at: string;
    event: { name: string };
  };
}

export default function TicketScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [t, setT] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from("guests")
        .select(
          "full_name, status, plus_ones, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(name))"
        )
        .eq("check_in_token", token)
        .maybeSingle<Ticket>();
      setT(data ?? null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }
  if (!t) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-cream text-2xl">Ticket not found.</Text>
      </SafeAreaView>
    );
  }

  const active = t.status === "approved";

  return (
    <SafeAreaView className="flex-1 bg-bg px-6">
      <Pressable onPress={() => router.back()} className="my-4">
        <Text className="text-muted text-[10px] uppercase tracking-widest">
          ← Back
        </Text>
      </Pressable>

      <Text className="text-cream text-4xl font-black uppercase mb-1">
        {t.night.event.name}
      </Text>
      <Text className="text-muted text-[10px] uppercase tracking-widest mb-6">
        {fmtDate(t.night.night_date)} · Doors {fmtTime(t.night.doors_at)}
      </Text>

      <View
        className="rounded-lg overflow-hidden self-center bg-cream items-center justify-center"
        style={{ width: 280, height: 280 }}
      >
        {active ? (
          <QRCode
            value={t.check_in_token}
            size={260}
            color="#0a0a0a"
            backgroundColor="#F2EDE4"
            ecl="M"
          />
        ) : (
          <Text className="text-gold text-4xl font-black">PENDING</Text>
        )}
      </View>

      <View className="bg-s1 border border-line rounded-lg p-4 mt-6">
        <Text className="text-muted text-[10px] uppercase tracking-widest mb-1">
          Guest
        </Text>
        <Text className="text-cream font-semibold">
          {t.full_name}
          {t.plus_ones > 0 && (
            <Text className="text-muted"> +{t.plus_ones}</Text>
          )}
        </Text>
      </View>

      <Text className="text-muted text-[10px] uppercase tracking-widest mt-6 text-center break-all">
        Token: {t.check_in_token}
      </Text>
    </SafeAreaView>
  );
}

