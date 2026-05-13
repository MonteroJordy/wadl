"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import ConfirmDialog from "@/components/confirm-dialog";
import { seedDryRunAction, clearDryRunAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
        setMsg({ kind: "ok", text: `Cleared ${res.deleted} DRYRUN guests.` });
      } else {
        setMsg({ kind: "err", text: res.error });
      }
      setClearOpen(false);
    });
  }

  return (
    <section className="w-card" style={{ padding: 20 }}>
      <div className="w-type-meta" style={{ marginBottom: 12 }}>
        GENERATE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <label
            htmlFor="count"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            COUNT (1–200)
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
            style={INPUT_STYLE}
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            marginTop: 24,
          }}
        >
          <input
            type="checkbox"
            checked={simulateScans}
            onChange={(e) => setSimulateScans(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--w-acc)" }}
          />
          <span
            style={{ color: "var(--w-fg)", fontSize: 14 }}
          >
            Simulate ~80% scans
          </span>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <Button
          variant="primary"
          type="button"
          onClick={seed}
          disabled={pending}
        >
          {pending ? "Working…" : "Seed dry run"}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={clear}
          disabled={pending || existingCount === 0}
          style={{
            borderColor: "var(--w-err)",
            color: "var(--w-err)",
          }}
        >
          {pending
            ? "…"
            : `Clear ${existingCount > 0 ? `(${existingCount})` : ""}`}
        </Button>
      </div>

      {msg && (
        <div
          className="w-type-meta"
          style={{
            marginTop: 12,
            color: msg.kind === "ok" ? "var(--w-ok)" : "var(--w-err)",
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
