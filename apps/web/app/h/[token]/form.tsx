"use client";

import { useState, useTransition } from "react";
import { addHolderGuestAction } from "./actions";

export default function HolderAddForm({
  token,
  plusOnesAllowed,
  listOpen,
}: {
  token: string;
  plusOnesAllowed: boolean;
  listOpen: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [plusOnes, setPlusOnes] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(null);
    if (!fullName.trim()) return setError("Enter a name.");

    const fd = new FormData();
    fd.set("full_name", fullName.trim());
    if (plusOnesAllowed) fd.set("plus_ones", plusOnes);

    startTransition(async () => {
      const res = await addHolderGuestAction(token, fd);
      if (res?.error) setError(res.error);
      else {
        setAdded(fullName.trim());
        setFullName("");
        setPlusOnes("0");
      }
    });
  }

  if (!listOpen) {
    return (
      <div className="card text-center">
        <p className="label-mono mb-2">List closed</p>
        <p className="text-muted text-sm">
          The host has closed this list for now.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="fullName" className="label-mono block mb-2">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input-dark"
          placeholder="Guest full name"
          required
        />
      </div>

      {plusOnesAllowed && (
        <div>
          <label htmlFor="plusOnes" className="label-mono block mb-2">
            +1s
          </label>
          <input
            id="plusOnes"
            type="number"
            min={0}
            max={10}
            value={plusOnes}
            onChange={(e) => setPlusOnes(e.target.value)}
            className="input-dark"
          />
        </div>
      )}

      {error && <p className="text-coral text-sm">{error}</p>}
      {added && (
        <p className="text-mint text-sm">Added <span className="text-cream">{added}</span>.</p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add to list"}
      </button>
    </form>
  );
}
