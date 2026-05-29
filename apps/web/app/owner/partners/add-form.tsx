"use client";

import { useState, useTransition } from "react";
import { addPartnerAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

export default function AddPartnerForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [handle, setHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setName("");
    setCity("");
    setHandle("");
    setNotes("");
    setErr(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await addPartnerAction({ name, city, handle, notes });
      if (res.ok) {
        reset();
        setOpen(false);
      } else {
        setErr(res.error ?? "Failed.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--accent"
        onClick={() => setOpen(true)}
      >
        + New partner
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-card"
      style={{ padding: 18, borderColor: "var(--w-acc)" }}
    >
      <div className="w-type-meta" style={{ marginBottom: 12 }}>
        NEW VENUE PARTNER
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <label
            htmlFor="np-name"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            VENUE NAME
          </label>
          <input
            id="np-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wynwood Studios"
            style={INPUT_STYLE}
            autoFocus
            required
          />
        </div>
        <div>
          <label
            htmlFor="np-city"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            CITY
          </label>
          <input
            id="np-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Miami"
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label
            htmlFor="np-handle"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            HANDLE{" "}
            <span style={{ color: "var(--w-fg-muted)" }}>(OPTIONAL)</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--w-mono)",
                color: "var(--w-acc)",
              }}
            >
              @
            </span>
            <input
              id="np-handle"
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""))
              }
              placeholder="wynwoodstudios"
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="np-notes"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 4 }}
          >
            NOTES{" "}
            <span style={{ color: "var(--w-fg-muted)" }}>(OPTIONAL)</span>
          </label>
          <input
            id="np-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cap 350, doors 11pm, GM Sara"
            style={INPUT_STYLE}
          />
        </div>
      </div>
      {err && (
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)", marginBottom: 8 }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="submit" className="btn btn--accent" disabled={pending}>
          {pending ? "Saving…" : "Save partner"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={pending}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--w-fg-muted)",
            padding: "0 12px",
          }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
