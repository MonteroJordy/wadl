"use client";

import { useEffect, useState } from "react";

interface Props {
  /** VAPID public key from server. null = push not configured. */
  vapidPublicKey: string | null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) out[i] = decoded.charCodeAt(i);
  return out;
}

export default function PushSubscribeButton({ vapidPublicKey }: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "default"
  >("default");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, []);

  async function subscribe() {
    if (!vapidPublicKey) {
      setErr("Server isn't configured for push (missing VAPID keys).");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setErr("Permission denied.");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/service-worker.js"));
      const keyArr = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArr.buffer.slice(
          keyArr.byteOffset,
          keyArr.byteOffset + keyArr.byteLength,
        ) as ArrayBuffer,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        setErr("Server rejected subscription.");
        return;
      }
      setSubscribed(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setErr(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" },
        );
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="w-card" style={{ padding: 14 }}>
        <div className="w-type-meta" style={{ marginBottom: 4 }}>
          PUSH NOTIFICATIONS
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          Your browser doesn&apos;t support web push. iOS Safari requires
          16.4+ and the site added to home screen.
        </p>
      </div>
    );
  }

  if (!vapidPublicKey) {
    return (
      <div className="w-card" style={{ padding: 14 }}>
        <div className="w-type-meta" style={{ marginBottom: 4 }}>
          PUSH NOTIFICATIONS
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          Server isn&apos;t configured for push. Set{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>VAPID_PUBLIC_KEY</code>{" "}
          +{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>VAPID_PRIVATE_KEY</code>{" "}
          on the deployment to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="w-card" style={{ padding: 14 }}>
      <div className="w-type-meta" style={{ marginBottom: 8 }}>
        PUSH NOTIFICATIONS
      </div>
      {subscribed ? (
        <>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)", marginBottom: 12 }}
          >
            Active on this device.
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={unsubscribe}
            disabled={busy}
          >
            {busy ? "Working…" : "Turn off"}
          </button>
        </>
      ) : (
        <>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginBottom: 12 }}
          >
            Get notified when an RSVP needs review, capacity hits 85%, or
            staff change.
          </p>
          <button
            type="button"
            className="btn"
            onClick={subscribe}
            disabled={busy || permission === "denied"}
          >
            {permission === "denied"
              ? "Blocked in browser settings"
              : busy
                ? "Subscribing…"
                : "Enable on this device"}
          </button>
        </>
      )}
      {err && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 8 }}
        >
          {err}
        </p>
      )}
    </div>
  );
}
