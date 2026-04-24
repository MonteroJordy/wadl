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
      // Optimistically update the row.
      setResults((rs) =>
        rs.map((r) => (r.id === id ? { ...r, checked_in_at: res.scannedAt } : r))
      );
    } else {
      setMessage({ id, kind: "err", text: res.error });
    }
    setSelectedId(null);
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={backHref} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono text-mint">Search</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-4">{eventName}</h1>

      <input
        type="text"
        placeholder="Search by name"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-dark mb-4"
      />

      {pending && <p className="label-mono">Searching…</p>}

      {query && !pending && results.length === 0 && (
        <p className="label-mono text-center text-mint mt-4">
          No match — try a different spelling or scan the QR.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((r) => {
          const checkedIn = Boolean(r.checked_in_at);
          const isSelected = selectedId === r.id;
          const rowMsg = message?.id === r.id ? message : null;
          return (
            <div
              key={r.id}
              className={`card ${r.flag_dna ? "border-coral" : checkedIn ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-cream font-semibold truncate">
                    {r.full_name}
                    {r.plus_ones > 0 && (
                      <span className="text-muted font-normal"> +{r.plus_ones}</span>
                    )}
                    {r.flag_dna && (
                      <span className="ml-2 label-mono text-coral">⚠ DNA</span>
                    )}
                  </p>
                  <p className="label-mono mt-1 truncate">
                    {r.tier.toUpperCase()}
                    {r.allocation_name && <> · {r.allocation_name}</>}
                    {checkedIn && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-mint">
                          IN{" "}
                          {new Date(r.checked_in_at!).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {checkedIn ? (
                  <span className="label-mono text-mint shrink-0">In</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => checkIn(r.id)}
                    disabled={isSelected || r.flag_dna || r.status !== "approved"}
                    className="bg-mint text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-3 rounded-md disabled:opacity-40 hover:brightness-110 transition shrink-0"
                  >
                    {isSelected ? "…" : "Check in"}
                  </button>
                )}
              </div>
              {rowMsg && (
                <p
                  className={`label-mono mt-2 ${
                    rowMsg.kind === "ok" ? "text-mint" : "text-coral"
                  }`}
                >
                  {rowMsg.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
