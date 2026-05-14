"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchGuestsAction,
  manualCheckInAction,
  type SearchHit,
} from "./actions";

export default function SearchForm({
  eventId,
  eventName,
  nightId,
  backHref,
}: {
  eventId: string;
  eventName: string;
  nightId: string;
  backHref: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { id: string; kind: "ok" | "err"; text: string } | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const { results } = await searchGuestsAction(nightId, query);
        setResults(results);
      });
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, nightId]);

  async function checkIn(id: string) {
    setSelectedId(id);
    setMessage(null);
    const res = await manualCheckInAction(eventId, id);
    if (res.ok) {
      setMessage({ id, kind: "ok", text: "Checked in." });
      setResults((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, checked_in_at: res.scannedAt } : r,
        ),
      );
    } else {
      setMessage({ id, kind: "err", text: res.error });
    }
    setSelectedId(null);
  }

  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div
          style={{
            padding: "var(--s-6) var(--s-8)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--s-2)",
            }}
          >
            <Link
              href={backHref}
              className="t-meta"
              style={{ color: "var(--fg-3)", textDecoration: "none" }}
            >
              ← Back
            </Link>
            <span className="t-meta">Manual lookup</span>
          </div>
          <div className="t-display-md">{eventName}</div>
        </div>

        <div
          style={{
            padding: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-4)",
          }}
        >
          <input
            type="text"
            placeholder="Search by name"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input"
          />

          {pending && <div className="t-meta">Searching…</div>}

          {query && !pending && results.length === 0 && (
            <div
              className="t-body-2"
              style={{ textAlign: "center", color: "var(--fg-3)" }}
            >
              No match — try a different spelling or scan the QR.
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {results.map((r) => {
              const checkedIn = Boolean(r.checked_in_at);
              const isSelected = selectedId === r.id;
              const rowMsg = message?.id === r.id ? message : null;
              const disabled =
                isSelected || r.flag_dna || r.status !== "approved";
              return (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    padding: "var(--s-5)",
                    borderColor: r.flag_dna ? "var(--err)" : undefined,
                    opacity: checkedIn ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "var(--s-3)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        className="t-h2"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.full_name}
                        {r.plus_ones > 0 && (
                          <span style={{ color: "var(--fg-3)" }}>
                            {" "}
                            +{r.plus_ones}
                          </span>
                        )}
                        {r.flag_dna && (
                          <span
                            className="chip chip--err"
                            style={{ marginLeft: "var(--s-2)" }}
                          >
                            DNA
                          </span>
                        )}
                      </div>
                      <div
                        className="t-meta"
                        style={{
                          marginTop: "var(--s-1)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.tier.replace(/_/g, " ").toUpperCase()}
                        {r.allocation_name && <> · {r.allocation_name}</>}
                        {checkedIn && (
                          <>
                            {" · "}
                            <span style={{ color: "var(--ok)" }}>
                              In{" "}
                              {new Date(
                                r.checked_in_at!,
                              ).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {checkedIn ? (
                      <span
                        className="chip chip--ok"
                        style={{ flexShrink: 0 }}
                      >
                        In
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => checkIn(r.id)}
                        disabled={disabled}
                        className="btn btn--lg"
                        style={{ flexShrink: 0 }}
                      >
                        {isSelected ? "…" : "Check in"}
                      </button>
                    )}
                  </div>
                  {rowMsg && (
                    <div
                      className="t-meta"
                      style={{
                        marginTop: "var(--s-2)",
                        color:
                          rowMsg.kind === "ok"
                            ? "var(--ok)"
                            : "var(--err)",
                      }}
                    >
                      {rowMsg.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
