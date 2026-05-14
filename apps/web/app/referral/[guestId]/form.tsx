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
      <div
        className="card"
        style={{ padding: "var(--s-4)", textAlign: "center" }}
      >
        <span className="chip chip--ghost">Closed</span>
        <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          You can&apos;t add friends right now — list closed or RSVP not
          active.
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
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}
    >
      <div>
        <label
          htmlFor="rname"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-2)" }}
        >
          Friend&apos;s full name
        </label>
        <input
          id="rname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Their full name"
          required
        />
      </div>
      {plusOnesAllowed && (
        <div>
          <label
            htmlFor="rplus"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-2)" }}
          >
            +1s
          </label>
          <input
            id="rplus"
            type="number"
            min={0}
            max={4}
            value={plus}
            onChange={(e) => setPlus(e.target.value)}
            className="input"
          />
        </div>
      )}
      {error && (
        <p className="t-body-2" style={{ color: "var(--err)" }}>
          {error}
        </p>
      )}
      {added && (
        <p className="t-body-2" style={{ color: "var(--ok)" }}>
          Added <span style={{ color: "var(--fg)" }}>{added}</span> to the
          list.
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add friend"}
      </button>
    </form>
  );
}
