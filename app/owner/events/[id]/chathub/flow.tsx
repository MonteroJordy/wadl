"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { parseChatAction, commitChatAction } from "./actions";
import type { ParsedLine } from "@/lib/chathub";

interface NightOption {
  id: string;
  night_date: string;
  doors_at: string;
}
interface AllocOption {
  id: string;
  holder_name: string;
}

const TIERS: Array<{ id: "ga" | "vip" | "all_access"; label: string }> = [
  { id: "ga", label: "GA" },
  { id: "vip", label: "VIP" },
  { id: "all_access", label: "All access" },
];

export default function ChatHubFlow({
  eventId,
  eventName,
  nights,
  allocations,
}: {
  eventId: string;
  eventName: string;
  nights: NightOption[];
  allocations: AllocOption[];
}) {
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [text, setText] = useState("");
  const [nightId, setNightId] = useState(nights[0]?.id ?? "");
  const [fallbackAlloc, setFallbackAlloc] = useState<string>(
    allocations[0]?.id ?? ""
  );
  const [defaultHolder, setDefaultHolder] = useState<string>(
    allocations[0]?.holder_name ?? ""
  );
  const [rows, setRows] = useState<ParsedLine[]>([]);
  const [backend, setBackend] = useState<"claude" | "regex" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committedCount, setCommittedCount] = useState(0);
  const [pending, startTransition] = useTransition();

  function onParse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return setError("Paste at least one name.");
    if (!nightId) return setError("Pick a night.");

    startTransition(async () => {
      const res = await parseChatAction(
        eventId,
        text,
        defaultHolder.trim() || null
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
      setBackend(res.backend);
      setStep("review");
    });
  }

  function updateRow(i: number, patch: Partial<ParsedLine>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  function onCommit() {
    setError(null);
    startTransition(async () => {
      const res = await commitChatAction(
        eventId,
        nightId,
        fallbackAlloc || null,
        rows.map((r) => ({
          name: r.name,
          tier: r.tier,
          plus_ones: r.plus_ones,
          attributed_to_holder_name: r.attributed_to_holder_name,
          raw_line: r.raw_line,
        }))
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCommittedCount(res.count);
      setStep("done");
    });
  }

  const total = rows.reduce((s, r) => s + 1 + r.plus_ones, 0);

  if (step === "done") {
    return (
      <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
        <p className="label-mono mb-2">Chat Hub</p>
        <h1 className="display-lg mb-2">Committed.</h1>
        <p className="text-muted text-sm mb-6">
          {committedCount} guest{committedCount === 1 ? "" : "s"} added to the list.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/owner/events/${eventId}/queue`}
            className="btn-primary text-center"
          >
            Review queue
          </Link>
          <button
            type="button"
            onClick={() => {
              setStep("input");
              setText("");
              setRows([]);
              setCommittedCount(0);
            }}
            className="btn-ghost"
          >
            Add more
          </button>
        </div>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main className="mx-auto max-w-frame md:max-w-3xl px-6 py-12">
        <header className="flex items-center justify-between pb-4">
          <button
            type="button"
            onClick={() => setStep("input")}
            className="label-mono hover:text-cream transition"
          >
            ← Edit input
          </button>
          <p className="label-mono">
            Parsed by{" "}
            <span className={backend === "claude" ? "text-coral" : "text-mint"}>
              {backend}
            </span>
          </p>
        </header>

        <h1 className="display-lg mb-2">Review &amp; commit.</h1>
        <p className="label-mono mb-4">
          {rows.length} rows · {total} heads incl. +1s
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {rows.map((r, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    className="input-dark text-sm"
                    placeholder="Name"
                  />
                  <p className="label-mono mt-2 truncate text-muted">
                    {r.raw_line}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="label-mono text-coral hover:brightness-125 shrink-0"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <select
                  value={r.tier}
                  onChange={(e) =>
                    updateRow(i, {
                      tier: e.target.value as "ga" | "vip" | "all_access",
                    })
                  }
                  className="input-dark text-xs py-2"
                >
                  {TIERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={r.plus_ones}
                  onChange={(e) =>
                    updateRow(i, {
                      plus_ones: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="input-dark text-xs py-2"
                  title="+1s"
                />
                <input
                  type="text"
                  placeholder="Holder"
                  value={r.attributed_to_holder_name ?? ""}
                  onChange={(e) =>
                    updateRow(i, {
                      attributed_to_holder_name: e.target.value || null,
                    })
                  }
                  className="input-dark text-xs py-2"
                />
              </div>
              <p className="label-mono mt-2">
                Confidence:{" "}
                <span
                  className={
                    r.confidence > 0.8
                      ? "text-mint"
                      : r.confidence > 0.5
                      ? "text-gold"
                      : "text-coral"
                  }
                >
                  {Math.round(r.confidence * 100)}%
                </span>
              </p>
            </div>
          ))}
        </div>

        {error && <p className="text-coral text-sm mb-3">{error}</p>}

        <button
          type="button"
          onClick={onCommit}
          disabled={pending || rows.length === 0}
          className="btn-primary"
        >
          {pending ? "Committing…" : `Commit ${rows.length} to ${eventName}`}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <p className="label-mono mb-2">Chat Hub</p>
      <h1 className="display-lg leading-[0.95] mb-2">Paste the names.</h1>
      <p className="text-muted text-sm mb-6">
        Drop in plain text from WhatsApp, Slack, or anywhere. We&apos;ll parse
        names, tiers, +1s, and who they&apos;re w/.
      </p>

      <form onSubmit={onParse} className="flex flex-col gap-4">
        {nights.length > 1 && (
          <div>
            <label htmlFor="night" className="label-mono block mb-2">
              Night
            </label>
            <select
              id="night"
              value={nightId}
              onChange={(e) => setNightId(e.target.value)}
              className="input-dark"
            >
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {new Date(n.night_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
        )}

        {allocations.length > 0 && (
          <div>
            <label htmlFor="alloc" className="label-mono block mb-2">
              Default holder (when a line doesn&apos;t specify one)
            </label>
            <select
              id="alloc"
              value={fallbackAlloc}
              onChange={(e) => {
                setFallbackAlloc(e.target.value);
                const m = allocations.find((a) => a.id === e.target.value);
                setDefaultHolder(m?.holder_name ?? "");
              }}
              className="input-dark"
            >
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.holder_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="paste" className="label-mono block mb-2">
            Paste names (one per line)
          </label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-dark min-h-[260px] font-mono text-xs"
            placeholder={`Diplo VIP\nAlice +2\nBob w/ Kiko VIP\nCarol Smith all access`}
            required
          />
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Parsing…" : "Parse"}
        </button>
      </form>
    </main>
  );
}
