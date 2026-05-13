"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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

const FRAME_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--w-bg)",
  padding: "32px 24px 96px",
};
const INNER_STYLE: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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

  if (step === "done") {
    return (
      <main id="main-content" className="w-app" style={FRAME_STYLE}>
        <div style={INNER_STYLE}>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            CHAT HUB
          </div>
          <div className="w-type-display-md" style={{ marginBottom: 8 }}>
            Committed.
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginBottom: 24 }}
          >
            {committedCount} guest{committedCount === 1 ? "" : "s"} added to
            the list.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <Link
              href={`/owner/events/${eventId}/queue`}
              style={{ textDecoration: "none" }}
            >
              <Button variant="primary" style={{ width: "100%" }}>
                Review queue
              </Button>
            </Link>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setStep("input");
                setText("");
                setRows([]);
                setCommittedCount(0);
              }}
            >
              Add more
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "review") {
    return (
      <main id="main-content" className="w-app" style={FRAME_STYLE}>
        <div style={{ ...INNER_STYLE, maxWidth: 880 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setStep("input")}
              className="w-type-meta"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--w-fg-muted)",
                padding: 0,
              }}
            >
              ← EDIT INPUT
            </button>
            <div className="w-type-meta">
              PARSED BY{" "}
              <span
                style={{
                  color:
                    backend === "claude"
                      ? "var(--w-acc)"
                      : "var(--w-ok)",
                }}
              >
                {backend?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="w-type-display-md" style={{ marginBottom: 8 }}>
            Review &amp; commit.
          </div>
          <p
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", marginBottom: 16 }}
          >
            {rows.length} ROWS · {total} HEADS INCL. +1S
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {rows.map((r, i) => (
              <div key={i} className="w-card" style={{ padding: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) =>
                        updateRow(i, { name: e.target.value })
                      }
                      style={{ ...INPUT_STYLE, fontSize: 14 }}
                      placeholder="Name"
                    />
                    <div
                      className="w-type-meta"
                      style={{
                        marginTop: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "var(--w-fg-muted)",
                      }}
                    >
                      {r.raw_line}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="w-type-meta"
                    style={{
                      flexShrink: 0,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--w-err)",
                      padding: 0,
                    }}
                  >
                    REMOVE
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 1fr",
                    gap: 6,
                    marginTop: 12,
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
                    style={{ ...INPUT_STYLE, fontSize: 12, padding: "8px 10px" }}
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
                    style={{ ...INPUT_STYLE, fontSize: 12, padding: "8px 10px" }}
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
                    style={{ ...INPUT_STYLE, fontSize: 12, padding: "8px 10px" }}
                  />
                </div>
                <div className="w-type-meta" style={{ marginTop: 8 }}>
                  CONFIDENCE:{" "}
                  <span
                    style={{
                      color:
                        r.confidence > 0.8
                          ? "var(--w-ok)"
                          : r.confidence > 0.5
                            ? "var(--w-warn)"
                            : "var(--w-err)",
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
              className="w-type-body-sm"
              style={{ color: "var(--w-err)", marginBottom: 12 }}
            >
              {error}
            </p>
          )}

          <Button
            variant="primary"
            type="button"
            onClick={onCommit}
            disabled={pending || rows.length === 0}
          >
            {pending ? "Committing…" : `Commit ${rows.length} to ${eventName}`}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="w-app" style={FRAME_STYLE}>
      <div style={INNER_STYLE}>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          CHAT HUB
        </div>
        <div className="w-type-display-md" style={{ marginBottom: 8 }}>
          Paste the names.
        </div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Drop in plain text from WhatsApp, Slack, or anywhere. We&apos;ll
          parse names, tiers, +1s, and who they&apos;re w/.
        </p>

        <form
          onSubmit={onParse}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {nights.length > 1 && (
            <div>
              <label
                htmlFor="night"
                className="w-type-meta"
                style={{ display: "block", marginBottom: 6 }}
              >
                NIGHT
              </label>
              <select
                id="night"
                value={nightId}
                onChange={(e) => setNightId(e.target.value)}
                style={INPUT_STYLE}
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
              <label
                htmlFor="alloc"
                className="w-type-meta"
                style={{ display: "block", marginBottom: 6 }}
              >
                DEFAULT HOLDER (WHEN A LINE DOESN&apos;T SPECIFY ONE)
              </label>
              <select
                id="alloc"
                value={fallbackAlloc}
                onChange={(e) => {
                  setFallbackAlloc(e.target.value);
                  const m = allocations.find((a) => a.id === e.target.value);
                  setDefaultHolder(m?.holder_name ?? "");
                }}
                style={INPUT_STYLE}
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
            <label
              htmlFor="paste"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              PASTE NAMES (ONE PER LINE)
            </label>
            <textarea
              id="paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                ...INPUT_STYLE,
                minHeight: 260,
                fontFamily: "var(--w-mono)",
                fontSize: 12,
              }}
              placeholder={`Diplo VIP\nAlice +2\nBob w/ Kiko VIP\nCarol Smith all access`}
              required
            />
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
            {pending ? "Parsing…" : "Parse"}
          </Button>
        </form>
      </div>
    </main>
  );
}
