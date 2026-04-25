import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Rect } from "react-native-svg";
import { fmtDate, fmtTime } from "@wadl/shared/format";
import { supabase } from "../../../src/lib/supabase";
// Cheap server-rendered QR via the existing web route. Avoids pulling a
// native QR codec dep; React Native can render an Image from a URL just
// fine, including SVGs via react-native-svg with a remote source we'd need
// to vector-decode. Simpler: we use react-native-qrcode-svg if available,
// else fall back to a remote PNG. Here we draw a placeholder grid (visual
// stand-in) and ship the real QR via the web URL fallback.

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
          <PlaceholderQR seed={t.check_in_token} />
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

/**
 * Minimal placeholder QR — deterministic grid from the token hash so each
 * ticket renders a unique pattern. Not a real QR; production should swap
 * in `react-native-qrcode-svg` (small dep, no extra config). This keeps
 * the scaffold dependency-light while still producing visible art.
 */
function PlaceholderQR({ seed }: { seed: string }) {
  const cells = 21;
  const size = 280;
  const cell = size / cells;
  // Hash seed → bit grid.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bits: boolean[] = [];
  for (let i = 0; i < cells * cells; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    bits.push((h & 1) === 1);
  }

  return (
    <Svg width={size} height={size}>
      {bits.map((on, i) => {
        if (!on) return null;
        const x = (i % cells) * cell;
        const y = Math.floor(i / cells) * cell;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            fill="#0a0a0a"
          />
        );
      })}
    </Svg>
  );
}
