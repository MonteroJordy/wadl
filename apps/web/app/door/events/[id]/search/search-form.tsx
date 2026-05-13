"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchGuestsAction,
  manualCheckInAction,
  type SearchHit,
} from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
        rs.map((r) => (r.id === id ? { ...r, checked_in_at: res.scannedAt } : r)),
      );
    } else {
      setMessage({ id, kind: "err", text: res.error });
    }
    setSelectedId(null);
  }

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={backHref}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta" style={{ color: "var(--w-ok)" }}>
            SEARCH
          </div>
        </div>

        <div className="w-type-display-md" style={{ marginBottom: 16 }}>
          {eventName}
        </div>

        <input
          type="text"
          placeholder="Search by name"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...INPUT_STYLE, marginBottom: 16 }}
        />

        {pending && (
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            SEARCHING…
          </div>
        )}

        {query && !pending && results.length === 0 && (
          <div
            className="w-type-meta"
            style={{
              textAlign: "center",
              color: "var(--w-ok)",
              marginTop: 16,
            }}
          >
            NO MATCH — TRY A DIFFERENT SPELLING OR SCAN THE QR.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {results.map((r) => {
            const checkedIn = Boolean(r.checked_in_at);
            const isSelected = selectedId === r.id;
            const rowMsg = message?.id === r.id ? message : null;
            return (
              <div
                key={r.id}
                className="w-card"
                style={{
                  padding: 14,
                  borderColor: r.flag_dna ? "var(--w-err)" : undefined,
                  opacity: checkedIn ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        color: "var(--w-fg)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.full_name}
                      {r.plus_ones > 0 && (
                        <span
                          style={{
                            color: "var(--w-fg-muted)",
                            fontWeight: 400,
                          }}
                        >
                          {" "}
                          +{r.plus_ones}
                        </span>
                      )}
                      {r.flag_dna && (
                        <span
                          className="w-type-meta"
                          style={{
                            marginLeft: 8,
                            color: "var(--w-err)",
                          }}
                        >
                          ⚠ DNA
                        </span>
                      )}
                    </p>
                    <div
                      className="w-type-meta"
                      style={{
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.tier.toUpperCase()}
                      {r.allocation_name && <> · {r.allocation_name}</>}
                      {checkedIn && (
                        <>
                          {" · "}
                          <span style={{ color: "var(--w-ok)" }}>
                            IN{" "}
                            {new Date(
                              r.checked_in_at!,
                            ).toLocaleTimeString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {checkedIn ? (
                    <div
                      className="w-type-meta"
                      style={{ color: "var(--w-ok)", flexShrink: 0 }}
                    >
                      IN
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => checkIn(r.id)}
                      disabled={
                        isSelected || r.flag_dna || r.status !== "approved"
                      }
                      style={{
                        background: "var(--w-ok)",
                        color: "var(--w-bg)",
                        border: "1px solid var(--w-ok)",
                        fontFamily: "var(--w-sans)",
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        padding: "12px 16px",
                        cursor: "pointer",
                        flexShrink: 0,
                        opacity:
                          isSelected ||
                          r.flag_dna ||
                          r.status !== "approved"
                            ? 0.4
                            : 1,
                      }}
                    >
                      {isSelected ? "…" : "Check in"}
                    </button>
                  )}
                </div>
                {rowMsg && (
                  <div
                    className="w-type-meta"
                    style={{
                      marginTop: 8,
                      color:
                        rowMsg.kind === "ok"
                          ? "var(--w-ok)"
                          : "var(--w-err)",
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
    </main>
  );
}
