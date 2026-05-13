"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Button } from "@/components/wadl";
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
      JSON.stringify({ guests, cached_at: Date.now() }),
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

function stateColors(state: ScanResult["state"]): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (state) {
    case "approved":
      return { bg: "var(--w-ok)", fg: "var(--w-bg)", border: "var(--w-ok)" };
    case "already_used":
      return { bg: "var(--w-warn)", fg: "var(--w-bg)", border: "var(--w-warn)" };
    case "do_not_admit":
      return { bg: "#7a0f14", fg: "var(--w-fg)", border: "#7a0f14" };
    case "not_found":
    case "wrong_event":
    case "wrong_night":
    case "error":
      return { bg: "var(--w-err)", fg: "var(--w-bg)", border: "var(--w-err)" };
  }
}

function stateTitle(state: ScanResult["state"]): string {
  switch (state) {
    case "approved":
      return "APPROVED";
    case "already_used":
      return "ALREADY IN";
    case "not_found":
      return "NOT ON LIST";
    case "wrong_event":
      return "WRONG EVENT";
    case "wrong_night":
      return "WRONG NIGHT";
    case "do_not_admit":
      return "⚠  DO NOT ADMIT";
    case "error":
      return "ERROR";
  }
}

const PILL = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  border: `1px solid ${color}`,
  color,
  fontFamily: "var(--w-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export default function Scanner({
  eventId,
  eventName,
  nightId,
  backHref,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastHandledRef = useRef<{ token: string; at: number } | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [result, setResult] = useState<UiResult | null>(null);

  const [online, setOnline] = useState(true);
  const [manifestStatus, setManifestStatus] = useState<
    "none" | "loading" | "ready" | "stale"
  >("none");
  const [manifestCachedAt, setManifestCachedAt] = useState<number | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const localScannedRef = useRef<Set<string>>(new Set());

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
      for (const g of cached) {
        if (g.scanned) localScannedRef.current.add(g.check_in_token);
      }
    }
    setQueueDepth(loadQueue().length);
  }, [nightId]);

  useEffect(() => {
    if (!online) return;
    setManifestStatus((s) => (s === "ready" ? s : "loading"));
    fetch(`/api/door/manifest/${nightId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: { guests?: ManifestGuest[]; generated_at?: string } | null) => {
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
        },
      )
      .catch(() => setManifestStatus((s) => (s === "loading" ? "none" : s)));
  }, [nightId, online]);

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
      const q = loadQueue();
      q.push({ token, scanned_at: at, event_id: eventId, night_id: nightId });
      saveQueue(q);
      setQueueDepth(q.length);
      return {
        state: "do_not_admit",
        guest: {
          id: g.id,
          full_name: g.full_name,
          plus_ones: g.plus_ones,
          tier: g.tier,
        },
        reason: g.flag_reason,
        at,
        offline: true,
      };
    }
    if (g.status !== "approved")
      return { state: "not_found", at, offline: true };
    if (localScannedRef.current.has(token)) {
      return {
        state: "already_used",
        guest: {
          id: g.id,
          full_name: g.full_name,
          plus_ones: g.plus_ones,
          tier: g.tier,
        },
        scannedAt: new Date().toISOString(),
        scannedByName: null,
        at,
        offline: true,
      };
    }
    localScannedRef.current.add(token);
    const q = loadQueue();
    q.push({ token, scanned_at: at, event_id: eventId, night_id: nightId });
    saveQueue(q);
    setQueueDepth(q.length);
    return {
      state: "approved",
      guest: {
        id: g.id,
        full_name: g.full_name,
        plus_ones: g.plus_ones,
        tier: g.tier,
      },
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
        },
      );
      controlsRef.current = controls;
      setStarted(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not start camera.";
      setStartError(msg);
    }
  }

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={backHref}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta" style={{ color: "var(--w-ok)" }}>
            SCAN
          </div>
        </div>

        <div className="w-type-display-md" style={{ marginBottom: 12 }}>
          {eventName}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={PILL(
              online ? "var(--w-ok)" : "var(--w-err)",
            )}
          >
            {online ? "● ONLINE" : "● OFFLINE"}
          </span>
          <span
            style={PILL(
              manifestStatus === "ready"
                ? "var(--w-ok)"
                : manifestStatus === "stale"
                  ? "var(--w-warn)"
                  : "var(--w-fg-muted)",
            )}
          >
            {manifestStatus === "ready"
              ? "MANIFEST CACHED"
              : manifestStatus === "stale"
                ? "STALE CACHE"
                : manifestStatus === "loading"
                  ? "CACHING…"
                  : "NO CACHE"}
          </span>
          {queueDepth > 0 && (
            <button
              type="button"
              onClick={() => void flushQueue()}
              disabled={!online || syncing}
              style={{
                ...PILL("var(--w-err)"),
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {syncing ? "SYNCING…" : `SYNC ${queueDepth}`}
            </button>
          )}
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            border: "2px solid var(--w-ok)",
            background: "var(--w-bg)",
            marginBottom: 16,
            aspectRatio: "1 / 1",
          }}
        >
          <video
            ref={videoRef}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            playsInline
            muted
          />

          {!started && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(20,20,20,0.92)",
                backdropFilter: "blur(4px)",
              }}
            >
              <div style={{ textAlign: "center", padding: "0 24px" }}>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 36,
                    color: "var(--w-ok)",
                    marginBottom: 12,
                  }}
                >
                  Camera off
                </div>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg-muted)",
                    marginBottom: 16,
                  }}
                >
                  Grant access to start scanning QRs.
                </p>
                <Button
                  variant="primary"
                  type="button"
                  onClick={start}
                  style={{
                    background: "var(--w-ok)",
                    color: "var(--w-bg)",
                    borderColor: "var(--w-ok)",
                  }}
                >
                  Start scanner
                </Button>
                {startError && (
                  <p
                    style={{
                      color: "var(--w-err)",
                      fontSize: 12,
                      marginTop: 12,
                    }}
                  >
                    {startError}
                  </p>
                )}
              </div>
            </div>
          )}

          {result &&
            (() => {
              const c = stateColors(result.state);
              return (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `4px solid ${c.border}`,
                    background: c.bg,
                    color: c.fg,
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "16px",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 44,
                        lineHeight: 1,
                        marginBottom: 12,
                      }}
                    >
                      {stateTitle(result.state)}
                    </div>
                    {"guest" in result && result.guest && (
                      <>
                        <p
                          style={{
                            fontSize: 22,
                            fontWeight: 600,
                          }}
                        >
                          {result.guest.full_name}
                          {result.guest.plus_ones > 0 && (
                            <span style={{ opacity: 0.75 }}>
                              {" "}
                              +{result.guest.plus_ones}
                            </span>
                          )}
                        </p>
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4, opacity: 0.8 }}
                        >
                          {result.guest.tier.toUpperCase()}
                        </div>
                      </>
                    )}
                    {result.state === "already_used" && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8, opacity: 0.8 }}
                      >
                        IN AT{" "}
                        {new Date(result.scannedAt).toLocaleTimeString()}
                        {result.scannedByName
                          ? ` · BY ${result.scannedByName.toUpperCase()}`
                          : ""}
                      </div>
                    )}
                    {result.state === "wrong_event" && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8 }}
                      >
                        QR IS FOR{" "}
                        <span style={{ fontWeight: 600 }}>
                          {result.actualEventName.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {result.state === "wrong_night" && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8 }}
                      >
                        QR IS FOR{" "}
                        {new Date(result.actualNightDate)
                          .toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                          .toUpperCase()}
                      </div>
                    )}
                    {result.state === "do_not_admit" && result.reason && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8, opacity: 0.8 }}
                      >
                        {result.reason}
                      </div>
                    )}
                    {result.state === "error" && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8, opacity: 0.8 }}
                      >
                        {result.error}
                      </div>
                    )}
                    {result.offline && (
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 8, opacity: 0.6 }}
                      >
                        OFFLINE · QUEUED
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </div>

        <div
          className="w-type-meta"
          style={{ textAlign: "center", lineHeight: 1.6 }}
        >
          {online
            ? "HOLD STEADY. AUTO-CONTINUES AFTER EACH SCAN."
            : `OFFLINE MODE — QUEUEING SCANS (${queueDepth} PENDING). RECONNECT TO SYNC.`}
          {manifestCachedAt && (
            <div style={{ marginTop: 4, color: "var(--w-fg-muted)" }}>
              CACHE FROM{" "}
              {new Date(manifestCachedAt).toLocaleTimeString().toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
