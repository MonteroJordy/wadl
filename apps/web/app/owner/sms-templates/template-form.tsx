"use client";

import { useState, useTransition } from "react";
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

const INLINE_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
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
        className="card"
        style={{
          padding: "var(--s-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        <div className="t-meta">
          {templates.find((t) => t.key === editing.key) ? "Edit" : "New"}{" "}
          template
        </div>
        <div>
          <label
            htmlFor="key"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-1)" }}
          >
            Key (e.g. doors_open)
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
            className="input"
            required
          />
        </div>
        <div>
          <label
            htmlFor="label"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-1)" }}
          >
            Label
          </label>
          <input
            id="label"
            type="text"
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label
            htmlFor="body"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-1)" }}
          >
            Body
          </label>
          <textarea
            id="body"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            className="input"
            style={{
              minHeight: 120,
              height: "auto",
              padding: "var(--s-3) var(--s-4)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
            required
          />
          <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
            Variables: <code className="kbd">{`{{guest.name}}`}</code>{" "}
            <code className="kbd">{`{{event.name}}`}</code>{" "}
            <code className="kbd">{`{{event.date}}`}</code>{" "}
            <code className="kbd">{`{{venue.name}}`}</code>
          </div>
        </div>
        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-2)",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setEditing(null)}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--accent" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
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
          gap: "var(--s-2)",
          marginBottom: "var(--s-6)",
        }}
      >
        <button type="button" className="btn btn--accent" onClick={startNew}>
          + New template
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={seed}
          disabled={pending}
        >
          Seed defaults
        </button>
      </div>

      {error && (
        <p
          className="t-body-2"
          style={{ color: "var(--err)", marginBottom: "var(--s-3)" }}
        >
          {error}
        </p>
      )}

      {templates.length === 0 ? (
        <div
          className="t-body-2"
          style={{ textAlign: "center", padding: "var(--s-8)" }}
        >
          No templates yet. Tap &quot;Seed defaults&quot; to install the four
          starter messages, or build your own.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
          }}
        >
          {templates.map((t) => (
            <div key={t.key} className="card" style={{ padding: "var(--s-4)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "var(--s-3)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="t-h2 truncate">{t.label}</p>
                  <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                    {t.key}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--s-3)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    style={{ ...INLINE_BTN, color: "var(--fg-3)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del(t.key)}
                    style={{ ...INLINE_BTN, color: "var(--err)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p
                style={{
                  color: "var(--fg-2)",
                  fontSize: 12,
                  marginTop: "var(--s-3)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--mono)",
                  lineHeight: 1.5,
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
