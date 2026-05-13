"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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

const INLINE_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--w-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--w-fg-muted)",
};

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
          marginBottom: 12,
        }}
      >
        <button type="button" onClick={selectAll} style={INLINE_BTN}>
          {selected.size === items.length ? "CLEAR" : "SELECT ALL"}
        </button>
        <Button
          variant="ghost"
          type="button"
          disabled={selected.size === 0 || pending}
          onClick={unflag}
          style={{ padding: "0 18px" }}
        >
          {pending ? "Working…" : `Unflag ${selected.size || ""}`}
        </Button>
      </div>

      {msg && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-ok)", marginBottom: 12 }}
        >
          {msg}
        </p>
      )}

      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {items.map((it) => (
          <li
            key={it.id}
            className="w-card"
            style={{
              padding: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              borderColor: selected.has(it.id) ? "var(--w-acc)" : undefined,
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(it.id)}
              onChange={() => toggle(it.id)}
              style={{
                marginTop: 4,
                accentColor: "var(--w-acc)",
                width: 18,
                height: 18,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{ color: "var(--w-fg)", fontWeight: 600 }}
              >
                {it.full_name}
                {it.phone && (
                  <span
                    style={{
                      color: "var(--w-fg-muted)",
                      marginLeft: 8,
                      fontSize: 12,
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {it.phone}
                  </span>
                )}
              </p>
              <div className="w-type-meta" style={{ marginTop: 2 }}>
                {it.event_name.toUpperCase()} · {it.night_date.toUpperCase()}
              </div>
              {it.reason && (
                <p
                  style={{
                    color: "var(--w-err)",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  {it.reason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
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
