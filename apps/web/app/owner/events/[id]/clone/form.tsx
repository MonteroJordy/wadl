"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import { cloneEventAction } from "./actions";

interface Props {
  eventId: string;
  sourceName: string;
  sourceNightCount: number;
  sourceAllocCount: number;
  earliestNightIso: string | null;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={`/owner/events/${eventId}`}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta">CLONE EVENT</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">Clone &amp; reuse.</div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Copies the event shell (name, type, venue, flyer) and shifts every
            night forward by N days. Guests, check-ins, and the audit log are
            NOT copied.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <label
              htmlFor="name"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              NEW EVENT NAME
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={INPUT_STYLE}
              required
            />
          </div>

          <div>
            <label
              htmlFor="shift"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              SHIFT DATES BY
            </label>
            <select
              id="shift"
              value={shiftDays}
              onChange={(e) => setShiftDays(parseInt(e.target.value, 10))}
              style={INPUT_STYLE}
            >
              <option value={7}>+1 week</option>
              <option value={14}>+2 weeks</option>
              <option value={28}>+4 weeks</option>
              <option value={1}>+1 day</option>
            </select>
            {previewLabel && (
              <div className="w-type-meta" style={{ marginTop: 8 }}>
                FIRST NIGHT WILL BE{" "}
                <span style={{ color: "var(--w-fg)" }}>
                  {previewLabel.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={copyAllocations}
              onChange={(e) => setCopyAllocations(e.target.checked)}
              style={{
                width: 20,
                height: 20,
                accentColor: "var(--w-acc)",
              }}
            />
            <span>
              <span
                style={{
                  color: "var(--w-fg)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Copy allocations
              </span>
              <div className="w-type-meta">
                {sourceAllocCount} HOLDER{sourceAllocCount === 1 ? "" : "S"}{" "}
                (WITH FRESH MAGIC LINKS)
              </div>
            </span>
          </label>

          <div className="w-type-meta">
            SOURCE: {sourceNightCount} NIGHT
            {sourceNightCount === 1 ? "" : "S"}
            {sourceAllocCount > 0 &&
              ` · ${sourceAllocCount} ALLOCATION${sourceAllocCount === 1 ? "" : "S"}`}
          </div>

          {error && (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-err)" }}
            >
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Cloning…" : "Clone event"}
          </Button>
        </form>
      </div>
    </main>
  );
}
