"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
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

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "var(--s-2) var(--s-3)",
    borderRadius: "var(--r-sm)",
    border: `1px solid ${active ? "var(--fg)" : "var(--line-2)"}`,
    background: active ? "var(--fg)" : "transparent",
    color: active ? "var(--bg)" : "var(--fg-3)",
    fontSize: "var(--ts-sm)",
    fontWeight: active ? 500 : 400,
    cursor: "pointer",
    textTransform: "capitalize",
  };
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
  const [status, setStatus] = useState<"approved" | "pending" | "all">(
    "approved",
  );
  const [tier, setTier] = useState<"ga" | "vip" | "all_access" | "all">("all");
  const [preview, setPreview] = useState<{
    count: number;
    cost: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(
    null,
  );
  const [sendOpen, setSendOpen] = useState(false);

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
      if (res.ok)
        setPreview({ count: res.recipientCount, cost: res.estimatedCost });
      else setErr(res.error);
    });
  }

  function onSend() {
    if (!preview) return;
    setSendOpen(true);
  }

  function doSend() {
    setErr(null);
    startTransition(async () => {
      const res = await sendBroadcastAction(eventId, filter, body);
      if (res.ok) {
        setDone({ sent: res.sent, failed: res.failed });
        setPreview(null);
      } else setErr(res.error);
      setSendOpen(false);
    });
  }

  if (done) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-6)", maxWidth: 560 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div className="t-h1">Broadcast sent</div>
          <span className="chip chip--ok">Sent</span>
        </div>
        <div className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          {done.sent} sent · {done.failed} failed
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "var(--s-3)",
        maxWidth: 880,
      }}
    >
      {/* Target card */}
      <div className="card" style={{ padding: "var(--s-5)" }}>
        <div className="t-h1" style={{ marginBottom: "var(--s-4)" }}>
          Target
        </div>
        <div style={{ display: "grid", gap: "var(--s-4)" }}>
          <div>
            <div className="t-meta">Night</div>
            <select
              value={nightId}
              onChange={(e) => {
                setNightId(e.target.value);
                setAllocationId("");
                setPreview(null);
              }}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
            >
              <option value="">All nights</option>
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="t-meta">Status</div>
            <div
              style={{
                display: "flex",
                gap: "var(--s-2)",
                marginTop: "var(--s-2)",
                flexWrap: "wrap",
              }}
            >
              {(["approved", "pending", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setPreview(null);
                  }}
                  style={pillStyle(status === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="t-meta">Tier</div>
            <div
              style={{
                display: "flex",
                gap: "var(--s-2)",
                marginTop: "var(--s-2)",
                flexWrap: "wrap",
              }}
            >
              {(["all", "ga", "vip", "all_access"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTier(t);
                    setPreview(null);
                  }}
                  style={pillStyle(tier === t)}
                >
                  {t === "all_access" ? "AA" : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="t-meta">Allocation</div>
            <select
              value={allocationId}
              onChange={(e) => {
                setAllocationId(e.target.value);
                setPreview(null);
              }}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
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
      </div>

      {/* Message card */}
      <div className="card" style={{ padding: "var(--s-5)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "var(--s-4)",
          }}
        >
          <div className="t-h1">Message</div>
          <span className="t-meta">{body.length}/160</span>
        </div>

        {templates.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) setBody(t.body.slice(0, 160));
            }}
            className="input"
            style={{ marginBottom: "var(--s-3)" }}
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

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={160}
          className="input"
          style={{ minHeight: 120 }}
          placeholder="Doors open at 11. {{guest.name}}, see you there."
        />
        <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
          Variables: {"{{guest.name}}"} · {"{{event.name}}"} ·{" "}
          {"{{event.date}}"} · {"{{venue.name}}"}
        </div>

        {err && (
          <p
            className="t-body-2"
            style={{ color: "var(--err)", marginTop: "var(--s-3)" }}
          >
            {err}
          </p>
        )}

        {!preview ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onPreview}
            disabled={pending || !body.trim()}
            style={{ marginTop: "var(--s-4)" }}
          >
            {pending ? "Counting…" : "Preview recipients"}
          </button>
        ) : (
          <div
            className="card"
            style={{ padding: "var(--s-4)", marginTop: "var(--s-4)" }}
          >
            <div className="t-meta">Preview</div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--s-2)",
                marginTop: "var(--s-2)",
              }}
            >
              <span className="t-display-sm t-num">{preview.count}</span>
              <span className="t-body-2">recipients</span>
            </div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              Est. cost ${preview.cost.toFixed(2)}
            </div>
            <div
              style={{
                display: "flex",
                gap: "var(--s-2)",
                marginTop: "var(--s-4)",
              }}
            >
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPreview(null)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn"
                onClick={onSend}
                disabled={pending || preview.count === 0}
              >
                {pending ? "Sending…" : `Send ${preview.count}`}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={sendOpen}
        title={
          preview
            ? `Send to ${preview.count} guest${preview.count === 1 ? "" : "s"}?`
            : "Send broadcast?"
        }
        body={
          preview
            ? `Estimated cost: $${preview.cost}. Sends start immediately and can't be recalled once they hit the carrier.`
            : "Sends start immediately and can't be recalled once they hit the carrier."
        }
        confirmLabel="Send broadcast"
        pending={pending}
        onConfirm={doSend}
        onCancel={() => setSendOpen(false)}
      />
    </div>
  );
}
