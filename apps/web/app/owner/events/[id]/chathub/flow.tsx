"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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
    allocations[0]?.id ?? "",
  );
  const [defaultHolder, setDefaultHolder] = useState<string>(
    allocations[0]?.holder_name ?? "",
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
        defaultHolder.trim() || null,
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
        })),
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

  const crumbs: Array<string | [string, string]> = [
    ["Events", "/owner"],
    [eventName, `/owner/events/${eventId}`],
    "Chat hub",
  ];

  if (step === "done") {
    return (
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <Breadcrumb items={crumbs} />
        <PageHeader
          eyebrow="Chat hub"
          title="Committed"
          sub={`${committedCount} guest${
            committedCount === 1 ? "" : "s"
          } added to the list.`}
        />
        <EventSubNav active="guests" eventId={eventId} />
        <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
          <div style={{ display: "flex", gap: "var(--s-2)" }}>
            <Link
              href={`/owner/events/${eventId}/queue`}
              className="btn btn--accent"
              style={{ textDecoration: "none" }}
            >
              Review queue
            </Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setStep("input");
                setText("");
                setRows([]);
                setCommittedCount(0);
              }}
            >
              Add more
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <Breadcrumb items={crumbs} />
        <PageHeader
          eyebrow={`Chat hub · parsed by ${backend ?? ""}`}
          title="Review & commit"
          sub={`${rows.length} rows · ${total} heads incl. +1s`}
          actions={
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep("input")}
            >
              Edit input
            </button>
          }
        />
        <EventSubNav active="guests" eventId={eventId} />

        <div style={{ padding: "var(--s-8)", maxWidth: 880 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
              marginBottom: "var(--s-4)",
            }}
          >
            {rows.map((r, i) => (
              <div key={i} className="card" style={{ padding: "var(--s-4)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--s-3)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) =>
                        updateRow(i, { name: e.target.value })
                      }
                      className="input"
                      placeholder="Name"
                    />
                    <div
                      className="t-meta truncate"
                      style={{ marginTop: "var(--s-2)" }}
                    >
                      {r.raw_line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="t-meta"
                    style={{
                      flexShrink: 0,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--err)",
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 1fr",
                    gap: "var(--s-2)",
                    marginTop: "var(--s-3)",
                  }}
                >
                  <select
                    value={r.tier}
                    onChange={(e) =>
                      updateRow(i, {
                        tier: e.target.value as
                          | "ga"
                          | "vip"
                          | "all_access",
                      })
                    }
                    className="input"
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
                    className="input"
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
                    className="input"
                  />
                </div>
                <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                  Confidence:{" "}
                  <span
                    style={{
                      color:
                        r.confidence > 0.8
                          ? "var(--ok)"
                          : r.confidence > 0.5
                            ? "var(--warn)"
                            : "var(--err)",
                    }}
                  >
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p
              className="t-body-2"
              style={{ color: "var(--err)", marginBottom: "var(--s-3)" }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn btn--accent"
            onClick={onCommit}
            disabled={pending || rows.length === 0}
          >
            {pending
              ? "Committing…"
              : `Commit ${rows.length} to ${eventName}`}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb items={crumbs} />
      <PageHeader
        eyebrow="Chat hub"
        title="Paste the names"
        sub="Drop in plain text from WhatsApp, Slack, or anywhere. We'll parse names, tiers, +1s, and who they're w/."
      />
      <EventSubNav active="guests" eventId={eventId} />

      <form
        onSubmit={onParse}
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        {nights.length > 1 && (
          <div>
            <label htmlFor="night" className="t-meta">
              Night
            </label>
            <select
              id="night"
              value={nightId}
              onChange={(e) => setNightId(e.target.value)}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
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
            <label htmlFor="alloc" className="t-meta">
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
              className="input"
              style={{ marginTop: "var(--s-2)" }}
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
          <label htmlFor="paste" className="t-meta">
            Paste names (one per line)
          </label>
          <textarea
            id="paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input"
            style={{
              marginTop: "var(--s-2)",
              minHeight: 260,
              fontFamily: "var(--mono)",
              fontSize: "var(--ts-sm)",
            }}
            placeholder={`Diplo VIP\nAlice +2\nBob w/ Kiko VIP\nCarol Smith all access`}
            required
          />
        </div>

        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--accent" disabled={pending}>
          {pending ? "Parsing…" : "Parse"}
        </button>
      </form>
    </main>
  );
}
