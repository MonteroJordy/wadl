"use client";

import { useState, useTransition } from "react";
import { addReferralAction } from "./actions";

export default function ReferralForm({
  guestId,
  plusOnesAllowed,
  active,
}: {
  guestId: string;
  plusOnesAllowed: boolean;
  active: boolean;
}) {
  const [name, setName] = useState("");
  const [plus, setPlus] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!active) {
    return (
      <div className="card text-center">
        <p className="label-mono mb-2">Closed</p>
        <p className="text-muted text-sm">
          You can&apos;t add friends right now — list closed or RSVP not active.
        </p>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(null);
    if (!name.trim()) return setError("Enter a name.");
    const fd = new FormData();
    fd.set("full_name", name.trim());
    if (plusOnesAllowed) fd.set("plus_ones", plus);
    startTransition(async () => {
      const res = await addReferralAction(guestId, fd);
      if (res?.error) setError(res.error);
      else {
        setAdded(name.trim());
        setName("");
        setPlus("0");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="rname" className="label-mono block mb-2">
          Friend&apos;s full name
        </label>
        <input
          id="rname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-dark"
          placeholder="Their full name"
          required
        />
      </div>
      {plusOnesAllowed && (
        <div>
          <label htmlFor="rplus" className="label-mono block mb-2">
            +1s
          </label>
          <input
            id="rplus"
            type="number"
            min={0}
            max={4}
            value={plus}
            onChange={(e) => setPlus(e.target.value)}
            className="input-dark"
          />
        </div>
      )}
      {error && <p className="text-coral text-sm">{error}</p>}
      {added && (
        <p className="text-mint text-sm">
          Added <span className="text-cream">{added}</span> to the list.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add friend"}
      </button>
    </form>
  );
}
