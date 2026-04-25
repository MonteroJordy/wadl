import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BarCodeScanner } from "expo-barcode-scanner";
import { supabase } from "../../src/lib/supabase";

interface ScanGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  flag_reason: string | null;
  event_night_id: string;
}

const DEDUPE_MS = 2500;

export default function DoorScanScreen() {
  const router = useRouter();
  const [perm, setPerm] = useState<"unknown" | "granted" | "denied">("unknown");
  const [busy, setBusy] = useState(false);
  const lastRef = useRef<{ token: string; at: number } | null>(null);
  const [result, setResult] = useState<{
    state: string;
    name?: string;
    body?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setPerm(status === "granted" ? "granted" : "denied");
    })();
  }, []);

  async function onScan({ data }: { data: string }) {
    const now = Date.now();
    if (
      lastRef.current &&
      lastRef.current.token === data &&
      now - lastRef.current.at < DEDUPE_MS
    ) {
      return;
    }
    lastRef.current = { token: data, at: now };
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setResult({ state: "error", body: "Sign in first." });
        return;
      }
      const { data: guest } = await supabase
        .from("guests")
        .select(
          "id, full_name, plus_ones, tier, status, flag_dna, flag_reason, event_night_id"
        )
        .eq("check_in_token", data)
        .maybeSingle<ScanGuest>();

      if (!guest) {
        setResult({ state: "not_found", body: "Not on list." });
        return;
      }
      if (guest.flag_dna) {
        await supabase.from("check_ins").insert({
          guest_id: guest.id,
          event_night_id: guest.event_night_id,
          scanned_by: u.user.id,
          state: "do_not_admit",
        });
        setResult({
          state: "do_not_admit",
          name: guest.full_name,
          body: guest.flag_reason ?? "Do not admit.",
        });
        return;
      }
      if (guest.status !== "approved") {
        setResult({ state: "not_found", body: "Not approved." });
        return;
      }
      // Check for prior approved scan.
      const { data: prior } = await supabase
        .from("check_ins")
        .select("scanned_at")
        .eq("guest_id", guest.id)
        .eq("state", "approved")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prior) {
        setResult({
          state: "already_used",
          name: guest.full_name,
          body: "Already in.",
        });
        return;
      }
      await supabase.from("check_ins").insert({
        guest_id: guest.id,
        event_night_id: guest.event_night_id,
        scanned_by: u.user.id,
        state: "approved",
      });
      setResult({
        state: "approved",
        name: guest.full_name,
        body: `${guest.tier.toUpperCase()}${guest.plus_ones ? ` · +${guest.plus_ones}` : ""}`,
      });
    } finally {
      setBusy(false);
      setTimeout(() => setResult(null), 1600);
    }
  }

  if (perm === "unknown") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#FF4A2B" />
      </SafeAreaView>
    );
  }
  if (perm === "denied") {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-cream text-2xl uppercase mb-4 text-center">
          Camera permission required
        </Text>
        <Text className="text-muted text-center text-sm">
          Open Settings → WADL → Camera and enable.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-6 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>
        <Text className="text-mint text-[10px] uppercase tracking-widest">
          ● Scan
        </Text>
      </View>

      <View className="mx-6 rounded-lg overflow-hidden border-2 border-mint/60 aspect-square">
        <BarCodeScanner
          onBarCodeScanned={busy ? undefined : onScan}
          style={{ flex: 1 }}
          barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
        />
        {result && (
          <View
            className={`absolute inset-0 items-center justify-center px-6 ${
              result.state === "approved"
                ? "bg-mint/95"
                : result.state === "already_used"
                ? "bg-gold/95"
                : "bg-coral/95"
            }`}
          >
            <Text className="text-bg text-4xl font-black uppercase text-center">
              {result.state === "approved"
                ? "APPROVED"
                : result.state === "already_used"
                ? "ALREADY IN"
                : result.state === "do_not_admit"
                ? "⚠ DO NOT ADMIT"
                : "NOT ON LIST"}
            </Text>
            {result.name && (
              <Text className="text-bg text-xl font-semibold mt-2 text-center">
                {result.name}
              </Text>
            )}
            {result.body && (
              <Text className="text-bg/90 text-xs uppercase tracking-widest mt-1 text-center">
                {result.body}
              </Text>
            )}
          </View>
        )}
      </View>

      <Text className="text-muted text-[10px] uppercase tracking-widest text-center mt-4 px-6">
        Hold steady. Auto-continues after each scan.
      </Text>
    </SafeAreaView>
  );
}
