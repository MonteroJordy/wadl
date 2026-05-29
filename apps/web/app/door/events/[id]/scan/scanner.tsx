"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { scanTokenAction, type ScanResult } from "./actions";
import { playFeedback, isMuted, setMuted } from "./feedback";

interface Props {
  eventId: string;
  eventName: string;
  nightId: string;
  backHref: string;
}

/**
 * UI-only result state. `sync_conflict` is surfaced when an offline-queued
 * scan we approved on THIS device comes back from /api/door/sync as
 * `already_used` — i.e. another device admitted the same guest while both
 * were offline.
 */
type SyncConflict = {
  state: "sync_conflict";
  guestName: string | null;
};
type UiResult = (ScanResult | SyncConflict) & { at: number; offline?: boolean };

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

interface SyncResultRow {
  token: string;
  scanned_at_ms: number;
  ok: boolean;
  state?: string;
  reason?: string;
}

const DEDUPE_MS = 2500;
const RESULT_HOLD_MS = 1600;
const CONFLICT_HOLD_MS = 6000;

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

/** Maps a result state → v5 token color used for the full-bleed result card. */
function stateColor(state: UiResult["state"]): string {
  switch (state) {
    case "approved":
      return "var(--ok)";
    case "already_used":
    case "sync_conflict":
      return "var(--warn)";
    case "do_not_admit":
      return "var(--err)";
    default:
      return "var(--err)";
  }
}

function stateTitle(state: UiResult["state"]): string {
  switch (state) {
    case "approved":
      return "Approved";
    case "already_used":
      return "Already in";
    case "sync_conflict":
      return "Already in elsewhere";
    case "not_found":
      return "Not on list";
    case "wrong_event":
      return "Wrong event";
    case "wrong_night":
      return "Wrong night";
    case "do_not_admit":
      return "Do not admit";
    case "error":
      return "Error";
  }
}

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
  const [muted, setMutedState] = useState(false);
  const [manifestStatus, setManifestStatus] = useState<
    "none" | "loading" | "ready" | "stale"
  >("none");
  const [manifestCachedAt, setManifestCachedAt] = useState<number | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const [syncing, setSyncing] = useState(false);
  /**
   * Mirror of the cached manifest in component state — kept in sync by the
   * load/refresh effects below. Powers the count display + manual-lookup
   * list in the v5 shell without re-reading localStorage on every render.
   */
  const [cachedGuests, setCachedGuests] = useState<ManifestGuest[]>([]);
  /**
   * Bump on every approved/already_used result so the in-count and the
   * "on list" lookup list re-render against the latest localScannedRef set.
   */
  const [scanTick, setScanTick] = useState(0);

  const localScannedRef = useRef<Set<string>>(new Set());
  /**
   * Tokens this device approved while offline. Used to detect a cross-device
   * double-admit: if sync later reports one of these as `already_used`, this
   * device lost the race and the guest was admitted on another scanner.
   */
  const offlineApprovedRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setMutedState(isMuted());
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
      setCachedGuests(cached);
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
          setCachedGuests(j.guests);
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

  function showResult(res: UiResult, holdMs: number) {
    setResult(res);
    playFeedback(res.state);
    // Bump tick so the in-count + lookup list reflect the new scanned set.
    if (res.state === "approved" || res.state === "already_used") {
      setScanTick((n) => n + 1);
    }
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setResult(null);
    }, holdMs);
  }

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
        const body = (await res.json()) as {
          results?: SyncResultRow[];
        };
        // Detect cross-device double-admit: a scan we approved offline came
        // back as already_used — another device won the race.
        const conflict = (body.results ?? []).find(
          (r) =>
            r.state === "already_used" &&
            offlineApprovedRef.current.has(r.token),
        );
        if (conflict) {
          const guestName =
            offlineApprovedRef.current.get(conflict.token) ?? null;
          showResult(
            { state: "sync_conflict", guestName, at: Date.now() },
            CONFLICT_HOLD_MS,
          );
        }
        offlineApprovedRef.current.clear();
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
    // Track this token so a later sync can report a cross-device conflict.
    offlineApprovedRef.current.set(token, g.full_name);
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
    showResult(res, RESULT_HOLD_MS);
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

  // Live count from cached manifest — used in the v5 top status bar.
  // scanTick is referenced so the in-count + lookup list re-render after
  // each approved/already_used result mutates localScannedRef.
  void scanTick;
  const totalCount = cachedGuests.length;
  const inCount = cachedGuests.reduce(
    (n, g) => n + (localScannedRef.current.has(g.check_in_token) ? 1 : 0),
    0,
  );

  // Manual-lookup name list — surfaces a few unscanned approved guests for
  // tap-to-confirm when the camera can't read the QR. Stays under the camera
  // so it's always thumb-reachable.
  const lookupNames = cachedGuests
    .filter(
      (g) =>
        g.status === "approved" &&
        !g.flag_dna &&
        !localScannedRef.current.has(g.check_in_token),
    )
    .slice(0, 5);

  return (
    <main
      id="main-content"
      className="v5 noscroll"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* ── Top status bar — tighter, mirrors V5DoorV2 ── */}
        <div
          style={{
            padding: "var(--s-4) var(--s-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--s-4)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="t-meta"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--s-2)",
              }}
            >
              <Link
                href={backHref}
                style={{
                  color: "var(--fg-3)",
                  textDecoration: "none",
                }}
              >
                ← Back
              </Link>
              <span style={{ color: "var(--fg-4)" }}>·</span>
              <span className="truncate">{eventName}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--s-2)",
                marginTop: "var(--s-1)",
              }}
            >
              <span
                className="t-num"
                style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}
              >
                {inCount}
              </span>
              {totalCount > 0 && (
                <span className="t-body-2" style={{ color: "var(--fg-3)" }}>
                  / {totalCount}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-2)",
              flexShrink: 0,
            }}
          >
            <div
              className={online && started ? "pulse" : "dot"}
              style={{
                width: 8,
                height: 8,
                borderRadius: "var(--r-pill)",
                background: online ? "var(--ok)" : "var(--err)",
              }}
            />
            <span className="t-meta">
              {!started
                ? "Idle"
                : online
                  ? "Scanning"
                  : "Offline"}
            </span>
          </div>
        </div>

        {/* ── Status chips strip ── */}
        <div
          style={{
            padding: "var(--s-3) var(--s-5)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
            flexWrap: "wrap",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span className={"chip " + (online ? "chip--ok" : "chip--err")}>
            {online ? "Online" : "Offline"}
          </span>
          <span
            className={
              "chip " +
              (manifestStatus === "ready"
                ? "chip--ok"
                : manifestStatus === "stale"
                  ? "chip--warn"
                  : "chip--ghost")
            }
          >
            {manifestStatus === "ready"
              ? "Manifest cached"
              : manifestStatus === "stale"
                ? "Stale cache"
                : manifestStatus === "loading"
                  ? "Caching…"
                  : "No cache"}
          </span>
          {queueDepth > 0 && (
            <button
              type="button"
              onClick={() => void flushQueue()}
              disabled={!online || syncing}
              className="chip chip--warn"
              style={{ cursor: "pointer", border: 0 }}
            >
              {syncing ? "Syncing…" : `Sync ${queueDepth}`}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
            }}
            className={"chip " + (muted ? "chip--ghost" : "")}
            style={{ cursor: "pointer", border: 0, marginLeft: "auto" }}
            aria-pressed={!muted}
            aria-label={muted ? "Unmute scan feedback" : "Mute scan feedback"}
            title={muted ? "Sound off" : "Sound on"}
          >
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
        </div>

        {/* ── Camera viewport (rounded, v5 r-lg) ── */}
        <div
          style={{
            padding: "var(--s-5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--s-3)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 340,
              overflow: "hidden",
              borderRadius: "var(--r-lg)",
              border: "2px dashed var(--line-3)",
              background: "var(--bg-2)",
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
                  background: "rgba(10,10,10,0.92)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "0 var(--s-6)",
                  }}
                >
                  <div className="t-display-sm">Camera off</div>
                  <p
                    className="t-body-2"
                    style={{
                      marginTop: "var(--s-2)",
                      marginBottom: "var(--s-5)",
                    }}
                  >
                    Grant access to start scanning QRs.
                  </p>
                  <button
                    type="button"
                    className="btn btn--lg"
                    onClick={start}
                  >
                    Start scanner
                  </button>
                  {startError && (
                    <p
                      className="t-meta"
                      style={{
                        color: "var(--err)",
                        marginTop: "var(--s-3)",
                      }}
                    >
                      {startError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Result overlay — full-bleed colored band ── */}
            {result &&
              (() => {
                const color = stateColor(result.state);
                const isOk = result.state === "approved";
                // Approved: solid green band, dark ink. Warn/Err: dark band
                // with colored title for high contrast against the camera feed.
                const bandBg = isOk ? "var(--ok)" : "rgba(10,10,10,0.96)";
                const titleColor = isOk ? "var(--bg)" : color;
                const bodyColor = isOk ? "var(--bg)" : "var(--fg)";
                return (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: bandBg,
                      border: `2px solid ${color}`,
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "var(--s-5)",
                        width: "100%",
                        color: bodyColor,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--w-display)",
                          fontWeight: 700,
                          fontSize: 36,
                          lineHeight: 1.05,
                          letterSpacing: "-0.02em",
                          color: titleColor,
                        }}
                      >
                        {stateTitle(result.state)}
                      </div>

                      {"guest" in result && result.guest && (
                        <>
                          <div
                            className="t-h1"
                            style={{
                              marginTop: "var(--s-3)",
                              color: bodyColor,
                            }}
                          >
                            {result.guest.full_name}
                            {result.guest.plus_ones > 0 && (
                              <span style={{ opacity: 0.65 }}>
                                {" "}
                                +{result.guest.plus_ones}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: "var(--s-2)",
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              className="chip chip--solid"
                              style={{
                                background: isOk
                                  ? "rgba(10,10,10,0.18)"
                                  : "var(--fg)",
                                color: isOk ? "var(--bg)" : "var(--bg)",
                              }}
                            >
                              {result.guest.tier
                                .replace(/_/g, " ")
                                .toUpperCase()}
                            </span>
                          </div>
                        </>
                      )}

                      {result.state === "sync_conflict" && (
                        <>
                          {result.guestName && (
                            <div
                              className="t-h1"
                              style={{
                                marginTop: "var(--s-3)",
                                color: bodyColor,
                              }}
                            >
                              {result.guestName}
                            </div>
                          )}
                          <div
                            className="t-body-2"
                            style={{
                              marginTop: "var(--s-2)",
                              color: bodyColor,
                            }}
                          >
                            Already admitted on another device.
                          </div>
                        </>
                      )}

                      {result.state === "already_used" && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                            opacity: 0.8,
                          }}
                        >
                          In at{" "}
                          {new Date(result.scannedAt).toLocaleTimeString()}
                          {result.scannedByName
                            ? ` · by ${result.scannedByName}`
                            : ""}
                        </div>
                      )}
                      {result.state === "wrong_event" && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                          }}
                        >
                          QR is for {result.actualEventName}
                        </div>
                      )}
                      {result.state === "wrong_night" && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                          }}
                        >
                          QR is for{" "}
                          {new Date(result.actualNightDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </div>
                      )}
                      {result.state === "do_not_admit" && result.reason && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                            opacity: 0.85,
                          }}
                        >
                          {result.reason}
                        </div>
                      )}
                      {result.state === "error" && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                            opacity: 0.85,
                          }}
                        >
                          {result.error}
                        </div>
                      )}
                      {"offline" in result && result.offline && (
                        <div
                          className="t-meta"
                          style={{
                            marginTop: "var(--s-2)",
                            color: bodyColor,
                            opacity: 0.65,
                          }}
                        >
                          Offline · queued
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>

          <div
            className="t-body-2"
            style={{ textAlign: "center", color: "var(--fg-3)" }}
          >
            {online && started
              ? "Point at QR · auto-detects"
              : !started
                ? "Tap Start scanner to begin"
                : `Offline · ${queueDepth} queued`}
          </div>
        </div>

        {/* ── Manual-lookup names list — quick tap to confirm by name ── */}
        {lookupNames.length > 0 && (
          <div style={{ padding: "0 var(--s-5) var(--s-4)" }}>
            <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
              On list · tap to look up
            </div>
            <div className="card" style={{ padding: 0 }}>
              {lookupNames.map((g) => (
                <Link
                  key={g.id}
                  href={`/door/events/${eventId}/search?q=${encodeURIComponent(
                    g.full_name,
                  )}`}
                  className="row"
                  style={{
                    gridTemplateColumns: "1fr auto",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="t-body truncate" style={{ fontWeight: 500 }}>
                      {g.full_name}
                      {g.plus_ones > 0 && (
                        <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
                          {" "}
                          +{g.plus_ones}
                        </span>
                      )}
                    </div>
                    {g.tier && (
                      <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                        {g.tier.replace(/_/g, " ").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="t-meta" style={{ color: "var(--fg-3)" }}>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* spacer pushes the action bar to the bottom on tall screens */}
        <div style={{ flex: 1 }} />

        {/* ── Bottom action bar: Manual + Walk-in ── */}
        <div
          style={{
            padding: "var(--s-4) var(--s-5)",
            borderTop: "1px solid var(--line)",
            background: "var(--bg)",
            position: "sticky",
            bottom: 0,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--s-2)",
            }}
          >
            <Link
              href={`/door/events/${eventId}/search`}
              className="btn btn--secondary btn--lg btn--block"
              style={{ textDecoration: "none" }}
            >
              Manual
            </Link>
            <Link
              href={`/door/events/${eventId}/walkup`}
              className="btn btn--secondary btn--lg btn--block"
              style={{ textDecoration: "none" }}
            >
              + Walk-in
            </Link>
          </div>
          {manifestCachedAt && (
            <div
              className="t-meta"
              style={{
                marginTop: "var(--s-2)",
                textAlign: "center",
                color: "var(--fg-4)",
              }}
            >
              Cache from {new Date(manifestCachedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
