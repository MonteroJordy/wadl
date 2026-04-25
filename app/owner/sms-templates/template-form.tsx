"use client";

import { useState, useTransition } from "react";
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

export default function TemplateManager({
  initial,
}: {
  initial: Template[];
}) {
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [editing, setEditing] = useState<Template | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      const res = await deleteTemplateAction(key);
      if (!res.ok) setError(res.error);
      else setTemplates((ts) => ts.filter((t) => t.key !== key));
    });
  }

  function seed() {
    startTransition(async () => {
      const res = await seedDefaultsAction();
      if (!res.ok) setError(res.error);
      else {
        // Refetch via refresh.
        location.reload();
      }
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(editing);
        }}
        className="card flex flex-col gap-4"
      >
        <p className="label-mono">
          {templates.find((t) => t.key === editing.key) ? "Edit" : "New"} template
        </p>
        <div>
          <label htmlFor="key" className="label-mono block mb-1">
            Key (e.g. doors_open)
          </label>
          <input
            id="key"
            type="text"
            value={editing.key}
            onChange={(e) =>
              setEditing({ ...editing, key: e.target.value.replace(/\s+/g, "_").toLowerCase() })
            }
            className="input-dark"
            required
          />
        </div>
        <div>
          <label htmlFor="label" className="label-mono block mb-1">
            Label
          </label>
          <input
            id="label"
            type="text"
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            className="input-dark"
            required
          />
        </div>
        <div>
          <label htmlFor="body" className="label-mono block mb-1">
            Body
          </label>
          <textarea
            id="body"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            className="input-dark min-h-[120px] font-mono text-xs"
            required
          />
          <p className="label-mono mt-2">
            Variables: <code>{`{{guest.name}}`}</code>{" "}
            <code>{`{{event.name}}`}</code>{" "}
            <code>{`{{event.date}}`}</code>{" "}
            <code>{`{{venue.name}}`}</code>
          </p>
        </div>
        {error && <p className="text-coral text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button type="button" onClick={startNew} className="btn-primary">
          + New template
        </button>
        <button type="button" onClick={seed} className="btn-ghost" disabled={pending}>
          Seed defaults
        </button>
      </div>

      {error && <p className="text-coral text-sm mb-3">{error}</p>}

      {templates.length === 0 ? (
        <p className="label-mono text-center text-mint">
          No templates yet. Tap &quot;Seed defaults&quot; to install the four
          starter messages, or build your own.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div key={t.key} className="card">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-cream font-semibold truncate">
                    {t.label}
                  </p>
                  <p className="label-mono mt-1">{t.key}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(t)}
                    className="label-mono hover:text-cream transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => del(t.key)}
                    className="label-mono text-coral hover:brightness-125"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-cream text-xs mt-3 whitespace-pre-wrap font-mono">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
