"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
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
  const [clearOpen, setClearOpen] = useState(false);
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
    setClearOpen(true);
  }

  function doClear() {
    setMsg(null);
    startTransition(async () => {
      const res = await clearDryRunAction(eventId);
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: `Cleared ${res.deleted} DRYRUN guests.`,
        });
      } else {
        setMsg({ kind: "err", text: res.error });
      }
      setClearOpen(false);
    });
  }

  return (
    <section className="card" style={{ padding: "var(--s-5)" }}>
      <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
        Generate
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--s-3)",
          marginBottom: "var(--s-4)",
        }}
      >
        <div>
          <label htmlFor="count" className="t-meta">
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
            className="input"
            style={{ marginTop: "var(--s-2)" }}
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-2)",
            cursor: "pointer",
            marginTop: "var(--s-6)",
          }}
        >
          <input
            type="checkbox"
            checked={simulateScans}
            onChange={(e) => setSimulateScans(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--fg)" }}
          />
          <span className="t-body">Simulate ~80% scans</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "var(--s-2)" }}>
        <button
          type="button"
          className="btn btn--accent"
          onClick={seed}
          disabled={pending}
        >
          {pending ? "Working…" : "Seed dry run"}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={clear}
          disabled={pending || existingCount === 0}
        >
          {pending
            ? "…"
            : `Clear ${existingCount > 0 ? `(${existingCount})` : ""}`}
        </button>
      </div>

      {msg && (
        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-3)",
            color: msg.kind === "ok" ? "var(--ok)" : "var(--err)",
          }}
        >
          {msg.text}
        </div>
      )}
      <ConfirmDialog
        open={clearOpen}
        title={`Delete all ${existingCount} DRYRUN guests?`}
        body="Real guests stay untouched. Only the seeded test guests get cleared. Cannot be undone."
        confirmLabel="Clear DRYRUN guests"
        danger
        pending={pending}
        onConfirm={doClear}
        onCancel={() => setClearOpen(false)}
      />
    </section>
  );
}
