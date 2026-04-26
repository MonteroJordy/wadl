"use client";

import { useState, useTransition } from "react";
import {
  previewBroadcastAction,
  sendBroadcastAction,
  type BroadcastFilter,
} from "./actions";

interface NightOpt {
  id: string;
  label: string;
}
interface AllocOpt {
  id: string;
  night_id: string;
  label: string;
}
interface TemplateOpt {
  id: string;
  key: string;
  label: string;
  body: string;
}

export default function BroadcastForm({
  eventId,
  nights,
  allocations,
  templates = [],
}: {
  eventId: string;
  nights: NightOpt[];
  allocations: AllocOpt[];
  templates?: TemplateOpt[];
}) {
  const [body, setBody] = useState("");
  const [nightId, setNightId] = useState<string>("");
  const [allocationId, setAllocationId] = useState<string>("");
  const [status, setStatus] = useState<"approved" | "pending" | "all">("approved");
  const [tier, setTier] = useState<"ga" | "vip" | "all_access" | "all">("all");
  const [preview, setPreview] = useState<{ count: number; cost: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(null);

  const filter: BroadcastFilter = {
    night_id: nightId || null,
    status,
    tier,
    allocation_id: allocationId || null,
  };

  const filteredAllocs = nightId
    ? allocations.filter((a) => a.night_id === nightId)
    : allocations;

  function onPreview() {
    setErr(null);
    setDone(null);
    startTransition(async () => {
      const res = await previewBroadcastAction(eventId, filter);
      if (res.ok) setPreview({ count: res.recipientCount, cost: res.estimatedCost });
      else setErr(res.error);
    });
  }

  function onSend() {
    if (!preview) return;
    if (
      !confirm(
        `Send to ${preview.count} guest${preview.count === 1 ? "" : "s"}? Est cost $${preview.cost}.`
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const res = await sendBroadcastAction(eventId, filter, body);
      if (res.ok) {
        setDone({ sent: res.sent, failed: res.failed });
        setPreview(null);
      } else setErr(res.error);
    });
  }

  if (done) {
    return (
      <div className="card border-mint/40">
        <p className="label-mono text-mint mb-2">Sent</p>
        <p className="text-cream">
          {done.sent} sent · {done.failed} failed
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <p className="label-mono mb-3">Target</p>
        <div className="grid gap-2">
          <label className="label-mono">Night</label>
          <select
            value={nightId}
            onChange={(e) => {
              setNightId(e.target.value);
              setAllocationId("");
              setPreview(null);
            }}
            className="input-dark"
          >
            <option value="">All nights</option>
            {nights.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          <label className="label-mono">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(["approved", "pending", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPreview(null);
                }}
                className={`p-2 rounded border ${
                  status === s ? "border-coral bg-s2 text-cream" : "border-line text-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="label-mono">Tier</label>
          <div className="grid grid-cols-4 gap-2">
            {(["all", "ga", "vip", "all_access"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTier(t);
                  setPreview(null);
                }}
                className={`p-2 rounded border text-xs ${
                  tier === t ? "border-coral bg-s2 text-cream" : "border-line text-muted"
                }`}
              >
                {t === "all_access" ? "AA" : t.toUpperCase()}
              </button>
            ))}
          </div>

          <label className="label-mono">Allocation</label>
          <select
            value={allocationId}
            onChange={(e) => {
              setAllocationId(e.target.value);
              setPreview(null);
            }}
            className="input-dark"
          >
            <option value="">Any</option>
            {filteredAllocs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="label-mono">
            Message ({body.length}/160)
          </label>
          {templates.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setBody(t.body.slice(0, 160));
              }}
              className="bg-s2 border border-line rounded px-2 py-1 text-xs font-mono text-cream"
              aria-label="Load saved template"
            >
              <option value="">Load template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={160}
          className="input-dark min-h-[120px]"
          placeholder="Doors open at 11. {{guest.name}}, see you there."
        />
        <p className="label-mono mt-2">
          Variables: <code>{"{{guest.name}}"}</code> ·{" "}
          <code>{"{{event.name}}"}</code> · <code>{"{{event.date}}"}</code> ·{" "}
          <code>{"{{venue.name}}"}</code>
        </p>
      </div>

      {err && <p className="text-coral text-sm">{err}</p>}

      {!preview ? (
        <button
          type="button"
          onClick={onPreview}
          disabled={pending || !body.trim()}
          className="btn-ghost"
        >
          {pending ? "Counting…" : "Preview recipients"}
        </button>
      ) : (
        <div className="card">
          <p className="label-mono mb-1">Preview</p>
          <p className="font-display text-3xl text-cream">
            {preview.count} <span className="text-muted text-base">recipients</span>
          </p>
          <p className="label-mono mt-1">Est. cost ${preview.cost.toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="btn-ghost"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={pending || preview.count === 0}
              className="btn-primary"
            >
              {pending ? "Sending…" : `Send ${preview.count}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
