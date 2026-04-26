import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

interface Row {
  id: string;
  kind: string;
  payload: { message?: string; href?: string } | null;
  read_at: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  rsvp_pending: "RSVP awaiting review",
  capacity_alert: "Capacity alert",
  staff_assigned: "Staff assigned",
  billing_event: "Billing update",
  co_owner_accepted: "Co-owner accepted",
  scan_failure_high: "High scan failure rate",
  waitlist_promoted: "Waitlist promoted",
  referral_arrived: "New referral",
  guest_flagged: "Guest flagged",
  tier_upgraded: "Tier upgraded",
  broadcast_sent: "Broadcast sent",
};

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

export default function MobileNotificationsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", u.user.id)
      .maybeSingle<{ account_id: string | null }>();
    if (!prof?.account_id) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, payload, read_at, created_at")
      .eq("account_id", prof.account_id)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", u.user?.id ?? "")
      .maybeSingle<{ account_id: string | null }>();
    if (!prof?.account_id) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("account_id", prof.account_id)
      .is("read_at", null);
    load();
  }

  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-6 pt-6 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            ← Back
          </Text>
        </Pressable>
        {unread > 0 && (
          <Pressable onPress={markAllRead}>
            <Text className="text-coral text-[10px] uppercase tracking-widest">
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor="#FF4A2B"
            refreshing={loading}
            onRefresh={load}
          />
        }
      >
        <Text className="text-coral text-[10px] uppercase tracking-widest mb-2">
          Inbox
        </Text>
        <Text className="text-cream text-5xl font-black uppercase tracking-tight mb-6">
          Notifications
        </Text>

        {rows.length === 0 && !loading && (
          <Text className="text-muted">Nothing yet.</Text>
        )}

        <View className="gap-2">
          {rows.map((r) => {
            const label = KIND_LABEL[r.kind] ?? r.kind;
            const message = r.payload?.message ?? label;
            return (
              <View
                key={r.id}
                className={`bg-s1 border rounded-lg p-3 ${
                  r.read_at ? "border-line" : "border-coral/40"
                }`}
              >
                <Text className="text-coral text-[10px] uppercase tracking-widest mb-1">
                  {label}
                </Text>
                <Text className="text-cream text-sm">{message}</Text>
                <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
                  {ago(r.created_at)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
