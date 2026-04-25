import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Expo Push registration. Call once on first authed app open.
 *
 * - Asks for notification permission (no-op if already granted/denied).
 * - Pulls the Expo push token for this device.
 * - Upserts a row into public.user_devices keyed by (user_id, expo_push_token).
 *
 * Server-side: lib/expo-push.ts on the web reads user_devices and posts
 * batches to https://exp.host/--/api/v2/push/send.
 */
export async function registerForPushNotifications(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  // Foreground handler — show heads-up + play sound when app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") return { ok: false, error: "Permission not granted." };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF4A2B",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  let tokenData;
  try {
    tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const token = tokenData.data;

  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: "Sign in first." };

  const { error: upsertErr } = await supabase
    .from("user_devices")
    .upsert(
      {
        user_id: u.user.id,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        expo_push_token: token,
        device_name:
          Constants.deviceName ?? Constants.platform?.ios?.model ?? "device",
        app_version:
          (Constants.expoConfig?.version ?? "0.0.0") +
          "+" +
          (Constants.nativeAppVersion ?? "0"),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,expo_push_token" }
    );
  if (upsertErr) return { ok: false, error: upsertErr.message };

  return { ok: true, token };
}
