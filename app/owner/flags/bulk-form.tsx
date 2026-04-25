"use client";

import { useState, useTransition } from "react";
import { bulkUnflagAction } from "./actions";

interface FlagItem {
  id: string;
  full_name: string;
  reason: string | null;
  event_name: string;
  night_date: string;
  phone: string | null;
}

export default function BulkFlagForm({ items }: { items: FlagItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function unflag() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Remove DNA flag from ${selected.size} guest${selected.size === 1 ? "" : "s"}?`
      )
    )
      return;
    startTransition(async () => {
      const res = await bulkUnflagAction([...selected]);
      if (res.ok) {
        setMsg(`Unflagged ${res.count}.`);
        setSelected(new Set());
      } else setMsg(res.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="label-mono hover:text-cream"
          onClick={selectAll}
        >
          {selected.size === items.length ? "Clear" : "Select all"}
        </button>
        <button
          type="button"
          disabled={selected.size === 0 || pending}
          onClick={unflag}
          className="btn-ghost w-auto px-4 disabled:opacity-40"
        >
          {pending ? "Working…" : `Unflag ${selected.size || ""}`}
        </button>
      </div>

      {msg && <p className="text-mint text-sm mb-3">{msg}</p>}

      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.id}
            className={`card flex items-start gap-3 ${
              selected.has(it.id) ? "border-coral" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(it.id)}
              onChange={() => toggle(it.id)}
              className="mt-1 accent-coral"
            />
            <div className="min-w-0 flex-1">
              <p className="font-sans font-semibold text-cream">
                {it.full_name}
                {it.phone && (
                  <span className="text-muted ml-2 text-xs font-mono">
                    {it.phone}
                  </span>
                )}
              </p>
              <p className="label-mono mt-0.5">
                {it.event_name} · {it.night_date}
              </p>
              {it.reason && (
                <p className="text-coral text-sm mt-1">{it.reason}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
