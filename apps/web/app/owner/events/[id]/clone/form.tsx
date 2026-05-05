"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cloneEventAction } from "./actions";

interface Props {
  eventId: string;
  sourceName: string;
  sourceNightCount: number;
  sourceAllocCount: number;
  earliestNightIso: string | null;
}

export default function CloneForm({
  eventId,
  sourceName,
  sourceNightCount,
  sourceAllocCount,
  earliestNightIso,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(`${sourceName} (copy)`);
  const [shiftDays, setShiftDays] = useState(7);
  const [copyAllocations, setCopyAllocations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewIso = earliestNightIso
    ? new Date(
        new Date(earliestNightIso).getTime() + shiftDays * 86_400_000
      ).toISOString()
    : null;
  const previewLabel = previewIso
    ? new Date(previewIso).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await cloneEventAction(eventId, {
        newName: name,
        shiftDays,
        copyAllocations,
      });
      if (!res.ok) setError(res.error);
      else router.push(`/owner/events/${res.newEventId}/settings`);
    });
  }

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between pb-4">
        <Link
          href={`/owner/events/${eventId}`}
          className="label-mono hover:text-cream transition"
        >
          ← Back
        </Link>
        <p className="label-mono">Clone event</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">Clone &amp; reuse.</h1>
      <p className="text-muted text-sm mb-6">
        Copies the event shell (name, type, venue, flyer) and shifts every night
        forward by N days. Guests, check-ins, and the audit log are NOT copied.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="label-mono block mb-2">
            New event name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            required
          />
        </div>

        <div>
          <label htmlFor="shift" className="label-mono block mb-2">
            Shift dates by
          </label>
          <select
            id="shift"
            value={shiftDays}
            onChange={(e) => setShiftDays(parseInt(e.target.value, 10))}
            className="input-dark"
          >
            <option value={7}>+1 week</option>
            <option value={14}>+2 weeks</option>
            <option value={28}>+4 weeks</option>
            <option value={1}>+1 day</option>
          </select>
          {previewLabel && (
            <p className="label-mono mt-2">
              First night will be{" "}
              <span className="text-cream">{previewLabel}</span>
            </p>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={copyAllocations}
            onChange={(e) => setCopyAllocations(e.target.checked)}
            className="w-5 h-5 accent-coral"
          />
          <span>
            <span className="font-sans text-cream text-sm font-semibold">
              Copy allocations
            </span>
            <span className="label-mono block">
              {sourceAllocCount} holder
              {sourceAllocCount === 1 ? "" : "s"} (with fresh magic links)
            </span>
          </span>
        </label>

        <p className="label-mono">
          Source: {sourceNightCount} night{sourceNightCount === 1 ? "" : "s"}
          {sourceAllocCount > 0 && ` · ${sourceAllocCount} allocation${sourceAllocCount === 1 ? "" : "s"}`}
        </p>

        {error && <p className="text-err text-sm">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Cloning…" : "Clone event"}
        </button>
      </form>
    </main>
  );
}
