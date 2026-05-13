"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

const PILL = (active: boolean): React.CSSProperties => ({
  padding: 10,
  border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
  background: active ? "var(--w-acc-soft)" : "var(--w-surface-1)",
  color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
  fontFamily: "var(--w-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
});

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
        className="w-card"
        style={{ padding: 16, borderColor: "var(--w-ok)" }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-ok)", marginBottom: 8 }}
        >
          SENT
        </div>
        <p style={{ color: "var(--w-fg)" }}>
          {done.sent} sent · {done.failed} failed
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="w-card" style={{ padding: 18 }}>
        <div className="w-type-meta" style={{ marginBottom: 12 }}>
          TARGET
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="w-type-meta">NIGHT</div>
          <select
            value={nightId}
            onChange={(e) => {
              setNightId(e.target.value);
              setAllocationId("");
              setPreview(null);
            }}
            style={INPUT_STYLE}
          >
            <option value="">All nights</option>
            {nights.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          <div className="w-type-meta">STATUS</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
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
                style={PILL(status === s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="w-type-meta">TIER</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
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
                style={PILL(tier === t)}
              >
                {t === "all_access" ? "AA" : t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="w-type-meta">ALLOCATION</div>
          <select
            value={allocationId}
            onChange={(e) => {
              setAllocationId(e.target.value);
              setPreview(null);
            }}
            style={INPUT_STYLE}
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
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div className="w-type-meta">MESSAGE ({body.length}/160)</div>
          {templates.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setBody(t.body.slice(0, 160));
              }}
              style={{
                background: "var(--w-surface-2)",
                border: "1px solid var(--w-line)",
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--w-mono)",
                color: "var(--w-fg)",
              }}
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
          style={{ ...INPUT_STYLE, minHeight: 120 }}
          placeholder="Doors open at 11. {{guest.name}}, see you there."
        />
        <div className="w-type-meta" style={{ marginTop: 8 }}>
          VARIABLES:{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>
            {"{{guest.name}}"}
          </code>{" "}
          ·{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>
            {"{{event.name}}"}
          </code>{" "}
          ·{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>
            {"{{event.date}}"}
          </code>{" "}
          ·{" "}
          <code style={{ fontFamily: "var(--w-mono)" }}>
            {"{{venue.name}}"}
          </code>
        </div>
      </div>

      {err && (
        <p className="w-type-body-sm" style={{ color: "var(--w-err)" }}>
          {err}
        </p>
      )}

      {!preview ? (
        <Button
          variant="ghost"
          type="button"
          onClick={onPreview}
          disabled={pending || !body.trim()}
        >
          {pending ? "Counting…" : "Preview recipients"}
        </Button>
      ) : (
        <div className="w-card" style={{ padding: 16 }}>
          <div className="w-type-meta" style={{ marginBottom: 4 }}>
            PREVIEW
          </div>
          <div
            style={{
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1,
              color: "var(--w-fg)",
            }}
          >
            {preview.count}{" "}
            <span
              style={{ color: "var(--w-fg-muted)", fontSize: 14 }}
            >
              recipients
            </span>
          </div>
          <div className="w-type-meta" style={{ marginTop: 6 }}>
            EST. COST ${preview.cost.toFixed(2)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
            }}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={() => setPreview(null)}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={onSend}
              disabled={pending || preview.count === 0}
            >
              {pending ? "Sending…" : `Send ${preview.count}`}
            </Button>
          </div>
        </div>
      )}
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
