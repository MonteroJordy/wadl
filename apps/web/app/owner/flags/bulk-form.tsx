"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
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
  const [open, setOpen] = useState(false);

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
    setOpen(true);
  }

  function doUnflag() {
    startTransition(async () => {
      const res = await bulkUnflagAction([...selected]);
      if (res.ok) {
        setMsg(`Unflagged ${res.count}.`);
        setSelected(new Set());
      } else setMsg(res.error);
      setOpen(false);
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--s-3)",
          gap: "var(--s-3)",
        }}
      >
        <button
          type="button"
          onClick={selectAll}
          className="t-meta"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            padding: 0,
            color: "var(--fg-3)",
          }}
        >
          {selected.size === items.length ? "Clear" : "Select all"}
        </button>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          disabled={selected.size === 0 || pending}
          onClick={unflag}
        >
          {pending ? "Working…" : `Unflag ${selected.size || ""}`}
        </button>
      </div>

      {msg && (
        <p
          className="t-body-2"
          style={{ color: "var(--ok)", marginBottom: "var(--s-3)" }}
        >
          {msg}
        </p>
      )}

      <div className="card">
        {items.map((it) => {
          const isSel = selected.has(it.id);
          return (
            <div
              key={it.id}
              className="row"
              onClick={() => toggle(it.id)}
              style={{
                gridTemplateColumns: "24px 180px 1fr 200px 120px",
                cursor: "pointer",
                background: isSel ? "var(--bg-3)" : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => toggle(it.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  accentColor: "var(--fg)",
                  width: 16,
                  height: 16,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <span
                  className="t-h2 truncate"
                  style={{ display: "block", fontFamily: "var(--mono)" }}
                >
                  {it.full_name}
                </span>
                {it.phone && (
                  <span
                    className="t-meta"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {it.phone}
                  </span>
                )}
              </div>
              <span className="t-body-2 truncate">
                {it.reason ?? "no reason on file"}
              </span>
              <span className="t-meta truncate">
                {it.event_name} · {it.night_date}
              </span>
              <span className="chip chip--warn">Do not admit</span>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={open}
        title={`Remove DNA flag from ${selected.size} guest${selected.size === 1 ? "" : "s"}?`}
        body="They'll be able to scan in normally at the door again. The original flag stays in the audit log."
        confirmLabel="Remove flag"
        pending={pending}
        onConfirm={doUnflag}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
