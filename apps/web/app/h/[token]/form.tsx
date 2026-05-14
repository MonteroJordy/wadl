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
      <div
        className="card"
        style={{ padding: "var(--s-5)", textAlign: "center" }}
      >
        <span className="chip chip--ghost">List closed</span>
        <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          The host has closed this list for now.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "var(--s-5)" }}>
      <div className="t-meta">Add a name</div>
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
          marginTop: "var(--s-3)",
        }}
      >
        <div>
          <label
            htmlFor="fullName"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-2)" }}
          >
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Guest full name"
            required
          />
        </div>

        {plusOnesAllowed && (
          <div>
            <label
              htmlFor="plusOnes"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              +1s
            </label>
            <input
              id="plusOnes"
              type="number"
              min={0}
              max={10}
              value={plusOnes}
              onChange={(e) => setPlusOnes(e.target.value)}
              className="input"
            />
          </div>
        )}

        {error ? (
          <p
            className="t-body-2"
            style={{ color: "var(--err)" }}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {added ? (
          <p
            className="t-body-2"
            style={{ color: "var(--ok)" }}
            role="status"
          >
            Added{" "}
            <strong style={{ color: "var(--fg)" }}>{added}</strong>.
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--lg btn--block"
          disabled={pending}
        >
          {pending ? "Adding…" : "Add to list"}
        </button>
      </form>
    </div>
  );
}
