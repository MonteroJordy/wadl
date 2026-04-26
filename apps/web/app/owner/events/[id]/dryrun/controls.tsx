"use client";

import { useState, useTransition } from "react";
import { seedDryRunAction, clearDryRunAction } from "./actions";

export default function DryRunControls({
  eventId,
  existingCount,
}: {
  eventId: string;
  existingCount: number;
}) {
  const [count, setCount] = useState("40");
  const [simulateScans, setSimulateScans] = useState(true);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  function seed() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedDryRunAction({
        eventId,
        count: parseInt(count, 10) || 40,
        simulateScans,
      });
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: `Seeded ${res.created} guests${
            simulateScans ? " + simulated scans" : ""
          }. Open the daydash.`,
        });
      } else {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  function clear() {
    if (
      !confirm(
        `Delete all ${existingCount} DRYRUN guests on this event? Real guests stay.`
      )
    )
      return;
    setMsg(null);
    startTransition(async () => {
      const res = await clearDryRunAction(eventId);
      if (res.ok) {
        setMsg({ kind: "ok", text: `Cleared ${res.deleted} DRYRUN guests.` });
      } else {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <section className="card">
      <p className="label-mono mb-3">Generate</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label-mono block mb-1" htmlFor="count">
            Count (1–200)
          </label>
          <input
            id="count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) =>
              setCount(e.target.value.replace(/[^\d]/g, "").slice(0, 3))
            }
            className="input-dark"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-6">
          <input
            type="checkbox"
            checked={simulateScans}
            onChange={(e) => setSimulateScans(e.target.checked)}
            className="w-4 h-4 accent-coral"
          />
          <span className="text-cream font-sans text-sm">
            Simulate ~80% scans
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={seed}
          disabled={pending}
          className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] py-3 rounded-md hover:brightness-110 transition disabled:opacity-50"
        >
          {pending ? "Working…" : "Seed dry run"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={pending || existingCount === 0}
          className="bg-transparent border border-coral/40 text-coral font-sans font-semibold text-xs uppercase tracking-[0.16em] py-3 rounded-md hover:bg-coral/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {pending ? "…" : `Clear ${existingCount > 0 ? `(${existingCount})` : ""}`}
        </button>
      </div>

      {msg && (
        <p
          className={`label-mono mt-3 ${
            msg.kind === "ok" ? "text-mint" : "text-coral"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
