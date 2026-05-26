"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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
        new Date(earliestNightIso).getTime() + shiftDays * 86_400_000,
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
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [sourceName, `/owner/events/${eventId}`],
          "Clone",
        ]}
      />
      <PageHeader
        eyebrow="Clone event"
        title="Clone & reuse"
        sub="Copies the event shell (name, type, venue, flyer) and shifts every night forward by N days. Guests, check-ins, and the audit log are NOT copied."
      />
      <EventSubNav active="settings" eventId={eventId} />

      <form
        onSubmit={onSubmit}
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <label htmlFor="name" className="t-meta">
            New event name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            style={{ marginTop: "var(--s-2)" }}
            required
          />
        </div>

        <div>
          <label htmlFor="shift" className="t-meta">
            Shift dates by
          </label>
          <select
            id="shift"
            value={shiftDays}
            onChange={(e) => setShiftDays(parseInt(e.target.value, 10))}
            className="input"
            style={{ marginTop: "var(--s-2)" }}
          >
            <option value={7}>+1 week</option>
            <option value={14}>+2 weeks</option>
            <option value={28}>+4 weeks</option>
            <option value={1}>+1 day</option>
          </select>
          {previewLabel && (
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              First night will be{" "}
              <span style={{ color: "var(--fg)" }}>{previewLabel}</span>
            </div>
          )}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={copyAllocations}
            onChange={(e) => setCopyAllocations(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--fg)" }}
          />
          <span>
            <span className="t-body" style={{ fontWeight: 500 }}>
              Copy allocations
            </span>
            <div className="t-meta">
              {sourceAllocCount} holder{sourceAllocCount === 1 ? "" : "s"} (with
              fresh magic links)
            </div>
          </span>
        </label>

        <div className="t-meta">
          Source: {sourceNightCount} night
          {sourceNightCount === 1 ? "" : "s"}
          {sourceAllocCount > 0 &&
            ` · ${sourceAllocCount} allocation${
              sourceAllocCount === 1 ? "" : "s"
            }`}
        </div>

        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--accent" disabled={pending}>
          {pending ? "Cloning…" : "Clone event"}
        </button>
      </form>
    </main>
  );
}
