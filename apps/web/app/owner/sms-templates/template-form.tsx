"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  upsertTemplateAction,
  deleteTemplateAction,
  seedDefaultsAction,
} from "./actions";

interface Template {
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

const INLINE_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--w-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export default function TemplateManager({
  initial,
}: {
  initial: Template[];
}) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [editing, setEditing] = useState<Template | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  function startNew() {
    setEditing({ key: "", label: "", body: "" });
  }

  function save(t: Template) {
    setError(null);
    const fd = new FormData();
    fd.set("key", t.key);
    fd.set("label", t.label);
    fd.set("body", t.body);
    startTransition(async () => {
      const res = await upsertTemplateAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTemplates((ts) => {
        const existing = ts.find((x) => x.key === t.key);
        if (existing) return ts.map((x) => (x.key === t.key ? t : x));
        return [...ts, t];
      });
      setEditing(null);
    });
  }

  function del(key: string) {
    setDeleteKey(key);
  }

  function doDelete(key: string) {
    startTransition(async () => {
      const res = await deleteTemplateAction(key);
      if (!res.ok) setError(res.error);
      else setTemplates((ts) => ts.filter((t) => t.key !== key));
      setDeleteKey(null);
    });
  }

  function seed() {
    startTransition(async () => {
      const res = await seedDefaultsAction();
      if (!res.ok) setError(res.error);
      else location.reload();
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(editing);
        }}
        className="w-card"
        style={{
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="w-type-meta">
          {templates.find((t) => t.key === editing.key) ? "EDIT" : "NEW"}{" "}
          TEMPLATE
        </div>
        <div>
          <label
            htmlFor="key"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            KEY (E.G. DOORS_OPEN)
          </label>
          <input
            id="key"
            type="text"
            value={editing.key}
            onChange={(e) =>
              setEditing({
                ...editing,
                key: e.target.value.replace(/\s+/g, "_").toLowerCase(),
              })
            }
            style={INPUT_STYLE}
            required
          />
        </div>
        <div>
          <label
            htmlFor="label"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            LABEL
          </label>
          <input
            id="label"
            type="text"
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            style={INPUT_STYLE}
            required
          />
        </div>
        <div>
          <label
            htmlFor="body"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            BODY
          </label>
          <textarea
            id="body"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            style={{
              ...INPUT_STYLE,
              minHeight: 120,
              fontFamily: "var(--w-mono)",
              fontSize: 12,
            }}
            required
          />
          <div className="w-type-meta" style={{ marginTop: 8 }}>
            VARIABLES:{" "}
            <code style={{ fontFamily: "var(--w-mono)" }}>
              {`{{guest.name}}`}
            </code>{" "}
            <code style={{ fontFamily: "var(--w-mono)" }}>
              {`{{event.name}}`}
            </code>{" "}
            <code style={{ fontFamily: "var(--w-mono)" }}>
              {`{{event.date}}`}
            </code>{" "}
            <code style={{ fontFamily: "var(--w-mono)" }}>
              {`{{venue.name}}`}
            </code>
          </div>
        </div>
        {error && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
          >
            {error}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <Button
            variant="ghost"
            type="button"
            onClick={() => setEditing(null)}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <Button variant="primary" type="button" onClick={startNew}>
          + New template
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={seed}
          disabled={pending}
        >
          Seed defaults
        </Button>
      </div>

      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginBottom: 12 }}
        >
          {error}
        </p>
      )}

      {templates.length === 0 ? (
        <div
          className="w-type-meta"
          style={{ textAlign: "center", color: "var(--w-ok)" }}
        >
          NO TEMPLATES YET. TAP &quot;SEED DEFAULTS&quot; TO INSTALL THE FOUR
          STARTER MESSAGES, OR BUILD YOUR OWN.
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {templates.map((t) => (
            <div key={t.key} className="w-card" style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
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
                    {t.label}
                  </p>
                  <div className="w-type-meta" style={{ marginTop: 4 }}>
                    {t.key}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    style={{ ...INLINE_BTN, color: "var(--w-fg-muted)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del(t.key)}
                    style={{ ...INLINE_BTN, color: "var(--w-err)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p
                style={{
                  color: "var(--w-fg)",
                  fontSize: 12,
                  marginTop: 12,
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--w-mono)",
                }}
              >
                {t.body}
              </p>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={deleteKey !== null}
        title="Delete this template?"
        body="The template will be removed. Existing sends already out the door are unaffected."
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={() => {
          if (deleteKey) doDelete(deleteKey);
        }}
        onCancel={() => setDeleteKey(null)}
      />
    </div>
  );
}
