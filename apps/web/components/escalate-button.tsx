"use client";

import { useState } from "react";
import { Button } from "@/components/wadl";

const PRESET_REASONS = [
  "ID dispute",
  "Crowd / line management",
  "Guest list confusion",
  "Approval needed",
  "Capacity question",
  "Refusing entry",
];

const INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

const INLINE_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--w-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--w-fg-muted)",
};

export default function EscalateButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<null | { smsSent: number }>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(useReason: string) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/notifications/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, reason: useReason || null }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        smsSent?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Failed (${res.status})`);
      } else {
        setDone({ smsSent: json.smsSent ?? 0 });
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div
        className="w-card"
        style={{
          padding: 16,
          borderColor: "var(--w-err)",
          background: "var(--w-surface-2)",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)", marginBottom: 4 }}
        >
          MANAGER PAGED
        </div>
        <p
          style={{
            color: "var(--w-fg)",
            opacity: 0.85,
            fontSize: 14,
          }}
        >
          {done.smsSent > 0
            ? `SMS sent to ${done.smsSent} manager${done.smsSent === 1 ? "" : "s"}.`
            : "Notification logged. Push delivered if subscribed."}
        </p>
        <button
          onClick={() => setDone(null)}
          style={{ ...INLINE_BTN, marginTop: 12 }}
          type="button"
        >
          DISMISS
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-card"
        style={{
          width: "100%",
          marginTop: 12,
          padding: 16,
          borderColor: "var(--w-err)",
          textAlign: "center",
          cursor: "pointer",
          background: "var(--w-surface-1)",
        }}
        type="button"
      >
        <div
          style={{
            fontFamily: "var(--w-display)",
            fontWeight: 700,
            fontSize: 22,
            color: "var(--w-err)",
            marginBottom: 4,
          }}
        >
          PAGE MANAGER
        </div>
        <div className="w-type-meta">ESCALATE NOW</div>
      </button>
    );
  }

  return (
    <div
      className="w-card"
      style={{ padding: 14, borderColor: "var(--w-err)", marginTop: 12 }}
    >
      <div
        className="w-type-meta"
        style={{ color: "var(--w-err)", marginBottom: 12 }}
      >
        PAGE THE MANAGER — PICK A REASON
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {PRESET_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => send(r)}
            disabled={pending}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              border: "1px solid var(--w-line)",
              background: "var(--w-surface-1)",
              color: "var(--w-fg)",
              fontSize: 14,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
            type="button"
          >
            {r}
          </button>
        ))}
      </div>
      <label
        htmlFor="escalate-other"
        className="w-type-meta"
        style={{ display: "block", marginBottom: 4 }}
      >
        OTHER (MAX 200 CHARS)
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="escalate-other"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. need backup at the gate"
          style={INPUT_STYLE}
          disabled={pending}
        />
        <Button
          variant="primary"
          type="button"
          onClick={() => send(reason)}
          disabled={pending}
          style={{
            background: "var(--w-err)",
            borderColor: "var(--w-err)",
            color: "var(--w-bg)",
            padding: "0 18px",
          }}
        >
          Send
        </Button>
      </div>
      {error && (
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)", marginTop: 8 }}
        >
          {error}
        </div>
      )}
      <button
        onClick={() => {
          setOpen(false);
          setReason("");
          setError(null);
        }}
        style={{ ...INLINE_BTN, marginTop: 12 }}
        type="button"
        disabled={pending}
      >
        CANCEL
      </button>
    </div>
  );
}
