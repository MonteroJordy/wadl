"use client";

import { useState, useTransition } from "react";
import { addPartnerAction } from "./actions";

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
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
      >
        + New partner
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card border-coral/40">
      <p className="label-mono mb-3">New venue partner</p>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="np-name" className="label-mono block mb-1">
            Venue name
          </label>
          <input
            id="np-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wynwood Studios"
            className="input-dark"
            autoFocus
            required
          />
        </div>
        <div>
          <label htmlFor="np-city" className="label-mono block mb-1">
            City
          </label>
          <input
            id="np-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Miami"
            className="input-dark"
          />
        </div>
        <div>
          <label htmlFor="np-handle" className="label-mono block mb-1">
            Handle <span className="text-muted">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-coral">@</span>
            <input
              id="np-handle"
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""))
              }
              placeholder="wynwoodstudios"
              className="input-dark flex-1"
            />
          </div>
        </div>
        <div>
          <label htmlFor="np-notes" className="label-mono block mb-1">
            Notes <span className="text-muted">(optional)</span>
          </label>
          <input
            id="np-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cap 350, doors 11pm, GM Sara"
            className="input-dark"
          />
        </div>
      </div>
      {err && <p className="label-mono text-coral mb-2">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-2.5 rounded-full hover:brightness-110 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save partner"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={pending}
          className="label-mono px-3 hover:text-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
