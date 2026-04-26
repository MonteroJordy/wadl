import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

const PRESET_REASONS = [
  "ID dispute",
  "Crowd / line management",
  "Guest list confusion",
  "Approval needed",
  "Capacity question",
  "Refusing entry",
];

const APP_URL =
  (Constants.expoConfig?.extra as { webUrl?: string })?.webUrl ??
  process.env.EXPO_PUBLIC_WEB_URL ??
  "https://wadl-pearl.vercel.app";

/**
 * Day 29 — Mobile equivalent of components/escalate-button.tsx (web).
 * Door staff page-the-manager. Auto-resolves the active event from the
 * user's first event_staff shift in the next 18h, then POSTs to
 * /api/notifications/escalate with a Bearer token (the mobile path).
 */
export default function EscalateButton() {
  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ smsSent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const start = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("event_staff")
        .select(
          "event_id, event:events!inner(id, name, event_nights!inner(doors_at))"
        )
        .eq("user_id", u.user.id)
        .gte("event.event_nights.doors_at", start)
        .lte("event.event_nights.doors_at", end)
        .limit(1);
      type Row = { event_id: string; event: { id: string; name: string } };
      const first = (data ?? [])[0] as unknown as Row | undefined;
      if (first) {
        setEventId(first.event_id);
        setEventName(first.event.name);
      }
    })();
  }, []);

  async function send(reason: string) {
    if (!eventId) {
      setError("No active event tonight.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) {
        setError("Sign in required.");
        return;
      }
      const res = await fetch(`${APP_URL}/api/notifications/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId, reason }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        smsSent?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      setDone({ smsSent: json.smsSent ?? 0 });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <View className="mx-6 mt-3 bg-s2 border border-coral/60 rounded-lg p-4">
        <Text className="text-coral text-[10px] uppercase tracking-widest mb-1">
          Manager paged
        </Text>
        <Text className="text-cream text-sm">
          {done.smsSent > 0
            ? `SMS sent to ${done.smsSent} manager${done.smsSent === 1 ? "" : "s"}.`
            : "Notification logged. Push delivered if subscribed."}
        </Text>
        <Pressable onPress={() => setDone(null)} className="mt-3">
          <Text className="text-muted text-[10px] uppercase tracking-widest">
            Dismiss
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className="mx-6 mt-3 bg-s1 border border-coral/40 rounded-lg p-4 items-center active:border-coral"
      >
        <Text className="text-coral text-2xl font-black uppercase tracking-tight">
          PAGE MANAGER
        </Text>
        <Text className="text-muted text-[10px] uppercase tracking-widest mt-1">
          Escalate now
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="mx-6 mt-3 bg-s1 border border-coral/60 rounded-lg p-4">
      <Text className="text-coral text-[10px] uppercase tracking-widest mb-3">
        Pick a reason
      </Text>
      {eventName && (
        <Text className="text-muted text-[10px] uppercase tracking-widest mb-3">
          For {eventName}
        </Text>
      )}
      <View className="gap-2 mb-3">
        {PRESET_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => send(r)}
            disabled={pending}
            className="bg-s2 border border-line rounded-md p-3 active:border-coral"
          >
            <Text className="text-cream text-sm">{r}</Text>
          </Pressable>
        ))}
      </View>
      {pending && <ActivityIndicator color="#FF4A2B" />}
      {error && (
        <Text className="text-coral text-[10px] uppercase tracking-widest mt-2">
          {error}
        </Text>
      )}
      <Pressable
        onPress={() => {
          setOpen(false);
          setError(null);
        }}
        disabled={pending}
        className="mt-3"
      >
        <Text className="text-muted text-[10px] uppercase tracking-widest">
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}
