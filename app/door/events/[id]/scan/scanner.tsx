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

type UiResult = ScanResult & { at: number };

const DEDUPE_MS = 2500;
const RESULT_HOLD_MS = 1600;

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

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

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

    const res = await scanTokenAction(eventId, nightId, text);
    setResult({ ...res, at: Date.now() });
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
        undefined, // let browser pick (prefers back camera on mobile)
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
            </div>
          </div>
        )}
      </div>

      <p className="label-mono text-center">
        Hold steady. Auto-continues after each scan.
      </p>
    </main>
  );
}
