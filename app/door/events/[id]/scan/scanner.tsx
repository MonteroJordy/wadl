"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { scanTokenAction, type ScanResult } from "./actions";

interface Props {
  eventId: string;
  eventName: string;
  nightId: string;
  backHref: string;
}

type UiResult = ScanResult & { at: number; offline?: boolean };

interface ManifestGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  flag_reason: string | null;
  check_in_token: string;
  scanned: boolean;
}

interface QueuedScan {
  scanned_at: number;
  token: string;
  event_id: string;
  night_id: string;
}

const DEDUPE_MS = 2500;
const RESULT_HOLD_MS = 1600;

function manifestKey(nightId: string) {
  return `wadl.manifest.${nightId}`;
}
function queueKey() {
  return `wadl.scan_queue`;
}
function loadManifest(nightId: string): ManifestGuest[] | null {
  try {
    const raw = localStorage.getItem(manifestKey(nightId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { guests: ManifestGuest[] };
    return parsed.guests ?? null;
  } catch {
    return null;
  }
}
function saveManifest(nightId: string, guests: ManifestGuest[]) {
  try {
    localStorage.setItem(
      manifestKey(nightId),
      JSON.stringify({ guests, cached_at: Date.now() })
    );
  } catch {
    /* quota — ignore */
  }
}
function loadQueue(): QueuedScan[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey()) ?? "[]") as QueuedScan[];
  } catch {
    return [];
  }
}
function saveQueue(q: QueuedScan[]) {
  try {
    localStorage.setItem(queueKey(), JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

function stateColor(state: ScanResult["state"]): string {
  switch (state) {
    case "approved":        return "bg-mint text-bg border-mint";
    case "already_used":    return "bg-gold text-bg border-gold";
    case "do_not_admit":    return "bg-[#7a0f14] text-cream border-[#7a0f14]";
    case "not_found":
    case "wrong_event":
    case "wrong_night":
    case "error":           return "bg-coral text-bg border-coral";
  }
}

function stateTitle(state: ScanResult["state"]): string {
  switch (state) {
    case "approved":      return "APPROVED";
    case "already_used":  return "ALREADY IN";
    case "not_found":     return "NOT ON LIST";
    case "wrong_event":   return "WRONG EVENT";
    case "wrong_night":   return "WRONG NIGHT";
    case "do_not_admit":  return "⚠  DO NOT ADMIT";
    case "error":         return "ERROR";
  }
}

export default function Scanner({ eventId, eventName, nightId, backHref }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastHandledRef = useRef<{ token: string; at: number } | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [result, setResult] = useState<UiResult | null>(null);

  const [online, setOnline] = useState(true);
  const [manifestStatus, setManifestStatus] = useState<"none" | "loading" | "ready" | "stale">(
    "none"
  );
  const [manifestCachedAt, setManifestCachedAt] = useState<number | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const localScannedRef = useRef<Set<string>>(new Set());

  // Online status tracking.
  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  // Load cached manifest synchronously on mount.
  useEffect(() => {
    const cached = loadManifest(nightId);
    if (cached) {
      setManifestStatus("stale");
      try {
        const raw = localStorage.getItem(manifestKey(nightId));
        if (raw) {
          const meta = JSON.parse(raw) as { cached_at?: number };
          if (meta.cached_at) setManifestCachedAt(meta.cached_at);
        }
      } catch {
        /* ignore */
      }
      // Pre-populate locally-scanned set from manifest.
      for (const g of cached) {
        if (g.scanned) localScannedRef.current.add(g.check_in_token);
      }
    }
    setQueueDepth(loadQueue().length);
  }, [nightId]);

  // Refresh manifest when online.
  useEffect(() => {
    if (!online) return;
    setManifestStatus((s) => (s === "ready" ? s : "loading"));
    fetch(`/api/door/manifest/${nightId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { guests?: ManifestGuest[]; generated_at?: string } | null) => {
        if (!j?.guests) {
          setManifestStatus((s) => (s === "loading" ? "none" : s));
          return;
        }
        saveManifest(nightId, j.guests);
        setManifestStatus("ready");
        setManifestCachedAt(Date.now());
        for (const g of j.guests) {
          if (g.scanned) localScannedRef.current.add(g.check_in_token);
        }
      })
      .catch(() => setManifestStatus((s) => (s === "loading" ? "none" : s)));
  }, [nightId, online]);

  // Auto-flush queue when online.
  useEffect(() => {
    if (!online) return;
    const q = loadQueue();
    if (q.length === 0) return;
    void flushQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function flushQueue() {
    const q = loadQueue();
    if (q.length === 0) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/door/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scans: q }),
      });
      if (res.ok) {
        saveQueue([]);
        setQueueDepth(0);
      }
    } catch {
      /* keep queue for next attempt */
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  async function offlineDecode(token: string): Promise<UiResult> {
    const cached = loadManifest(nightId) ?? [];
    const g = cached.find((x) => x.check_in_token === token);
    const at = Date.now();
    if (!g) return { state: "not_found", at, offline: true };
    if (g.flag_dna) {
      // Queue the DNA attempt so it gets logged when we reconnect.
      const q = loadQueue();
      q.push({ token, scanned_at: at, event_id: eventId, night_id: nightId });
      saveQueue(q);
      setQueueDepth(q.length);
      return {
        state: "do_not_admit",
        guest: { id: g.id, full_name: g.full_name, plus_ones: g.plus_ones, tier: g.tier },
        reason: g.flag_reason,
        at,
        offline: true,
      };
    }
    if (g.status !== "approved") return { state: "not_found", at, offline: true };
    if (localScannedRef.current.has(token)) {
      return {
        state: "already_used",
        guest: { id: g.id, full_name: g.full_name, plus_ones: g.plus_ones, tier: g.tier },
        scannedAt: new Date().toISOString(),
        scannedByName: null,
        at,
        offline: true,
      };
    }
    // Approved offline. Mark locally and queue.
    localScannedRef.current.add(token);
    const q = loadQueue();
    q.push({ token, scanned_at: at, event_id: eventId, night_id: nightId });
    saveQueue(q);
    setQueueDepth(q.length);
    return {
      state: "approved",
      guest: { id: g.id, full_name: g.full_name, plus_ones: g.plus_ones, tier: g.tier },
      at,
      offline: true,
    };
  }

  async function onDecode(text: string) {
    const now = Date.now();
    if (
      lastHandledRef.current &&
      lastHandledRef.current.token === text &&
      now - lastHandledRef.current.at < DEDUPE_MS
    ) {
      return;
    }
    lastHandledRef.current = { token: text, at: now };

    let res: UiResult;
    if (online) {
      try {
        const r = await scanTokenAction(eventId, nightId, text);
        res = { ...r, at: Date.now() };
      } catch {
        res = await offlineDecode(text);
      }
    } else {
      res = await offlineDecode(text);
    }
    setResult(res);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResult(null);
    }, RESULT_HOLD_MS);
  }

  async function start() {
    setStartError(null);
    try {
      const reader = new BrowserQRCodeReader();
      const video = videoRef.current;
      if (!video) return;

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (r) => {
          if (r) void onDecode(r.getText());
        }
      );
      controlsRef.current = controls;
      setStarted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start camera.";
      setStartError(msg);
    }
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={backHref} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono text-mint">Scan</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">{eventName}</h1>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={`label-mono px-2 py-0.5 rounded-full border ${
            online
              ? "border-mint/40 text-mint"
              : "border-coral/40 text-coral"
          }`}
        >
          {online ? "● ONLINE" : "● OFFLINE"}
        </span>
        <span
          className={`label-mono px-2 py-0.5 rounded-full border ${
            manifestStatus === "ready"
              ? "border-mint/40 text-mint"
              : manifestStatus === "stale"
              ? "border-gold/40 text-gold"
              : "border-line text-muted"
          }`}
        >
          {manifestStatus === "ready"
            ? `Manifest cached`
            : manifestStatus === "stale"
            ? `Stale cache`
            : manifestStatus === "loading"
            ? "Caching…"
            : "No cache"}
        </span>
        {queueDepth > 0 && (
          <button
            type="button"
            onClick={() => void flushQueue()}
            disabled={!online || syncing}
            className="label-mono px-2 py-0.5 rounded-full border border-coral/60 text-coral hover:text-cream"
          >
            {syncing ? "Syncing…" : `Sync ${queueDepth}`}
          </button>
        )}
      </div>

      <div
        className="relative w-full rounded-lg overflow-hidden border-2 border-mint/60 bg-bg mb-4"
        style={{ aspectRatio: "1 / 1" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-s2/90 backdrop-blur-sm">
            <div className="text-center px-6">
              <p className="font-display text-4xl text-mint mb-3">Camera off</p>
              <p className="text-muted text-sm mb-4">
                Grant access to start scanning QRs.
              </p>
              <button type="button" onClick={start} className="btn-primary bg-mint">
                Start scanner
              </button>
              {startError && (
                <p className="text-coral text-xs mt-3">{startError}</p>
              )}
            </div>
          </div>
        )}

        {result && (
          <div
            className={`absolute inset-0 flex items-center justify-center border-4 ${stateColor(
              result.state
            )}`}
          >
            <div className="text-center px-4 py-6 w-full">
              <p className="font-display text-5xl leading-none mb-3">
                {stateTitle(result.state)}
              </p>
              {"guest" in result && result.guest && (
                <>
                  <p className="font-sans text-2xl font-semibold">
                    {result.guest.full_name}
                    {result.guest.plus_ones > 0 && (
                      <span className="opacity-75"> +{result.guest.plus_ones}</span>
                    )}
                  </p>
                  <p className="label-mono mt-1 opacity-80">
                    {result.guest.tier.toUpperCase()}
                  </p>
                </>
              )}
              {result.state === "already_used" && (
                <p className="label-mono mt-2 opacity-80">
                  In at {new Date(result.scannedAt).toLocaleTimeString()}
                  {result.scannedByName ? ` · by ${result.scannedByName}` : ""}
                </p>
              )}
              {result.state === "wrong_event" && (
                <p className="label-mono mt-2">
                  QR is for <span className="font-semibold">{result.actualEventName}</span>
                </p>
              )}
              {result.state === "wrong_night" && (
                <p className="label-mono mt-2">
                  QR is for{" "}
                  {new Date(result.actualNightDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
              {result.state === "do_not_admit" && result.reason && (
                <p className="label-mono mt-2 opacity-80">{result.reason}</p>
              )}
              {result.state === "error" && (
                <p className="label-mono mt-2 opacity-80">{result.error}</p>
              )}
              {result.offline && (
                <p className="label-mono mt-2 opacity-60">offline · queued</p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="label-mono text-center">
        {online
          ? "Hold steady. Auto-continues after each scan."
          : `Offline mode — queueing scans (${queueDepth} pending). Reconnect to sync.`}
        {manifestCachedAt && (
          <span className="block mt-1 text-muted">
            Cache from {new Date(manifestCachedAt).toLocaleTimeString()}
          </span>
        )}
      </p>
    </main>
  );
}
