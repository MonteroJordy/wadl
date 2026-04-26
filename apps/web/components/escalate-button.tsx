"use client";

import { useState } from "react";

const PRESET_REASONS = [
  "ID dispute",
  "Crowd / line management",
  "Guest list confusion",
  "Approval needed",
  "Capacity question",
  "Refusing entry",
];

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
      const json = (await res.json()) as { ok: boolean; smsSent?: number; error?: string };
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
      <div className="card border-coral/60 bg-s2 mt-3 text-center">
        <p className="label-mono text-coral mb-1">Manager paged</p>
        <p className="text-cream/80 text-sm">
          {done.smsSent > 0
            ? `SMS sent to ${done.smsSent} manager${done.smsSent === 1 ? "" : "s"}.`
            : "Notification logged. Push delivered if subscribed."}
        </p>
        <button
          onClick={() => setDone(null)}
          className="label-mono mt-3 text-muted hover:text-cream"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card w-full mt-3 border-coral/40 hover:border-coral transition text-center"
        type="button"
      >
        <p className="font-display text-2xl text-coral mb-1">PAGE MANAGER</p>
        <p className="label-mono">Escalate now</p>
      </button>
    );
  }

  return (
    <div className="card border-coral/60 mt-3">
      <p className="label-mono text-coral mb-3">Page the manager — pick a reason</p>
      <div className="flex flex-col gap-2 mb-3">
        {PRESET_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => send(r)}
            disabled={pending}
            className="text-left px-3 py-2 rounded-md border border-line bg-s1 text-cream text-sm hover:border-coral transition disabled:opacity-50"
            type="button"
          >
            {r}
          </button>
        ))}
      </div>
      <label className="label-mono block mb-1" htmlFor="escalate-other">
        Other (max 200 chars)
      </label>
      <div className="flex gap-2">
        <input
          id="escalate-other"
          maxLength={200}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. need backup at the gate"
          className="flex-1 bg-s1 border border-line rounded-md px-3 py-2 text-cream text-sm focus:border-coral focus:outline-none"
          disabled={pending}
        />
        <button
          onClick={() => send(reason)}
          disabled={pending || (!reason.trim() && false)}
          className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 rounded-md hover:brightness-110 transition disabled:opacity-50"
          type="button"
        >
          Send
        </button>
      </div>
      {error && <p className="label-mono text-coral mt-2">{error}</p>}
      <button
        onClick={() => {
          setOpen(false);
          setReason("");
          setError(null);
        }}
        className="label-mono mt-3 text-muted hover:text-cream"
        type="button"
        disabled={pending}
      >
        Cancel
      </button>
    </div>
  );
}
