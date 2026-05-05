"use client";

import { useState, useTransition } from "react";
import { Button, Chip } from "@/components/wadl";
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
        className="w-card"
        style={{ padding: 18, textAlign: "center" }}
      >
        <Chip tone="ghost">LIST CLOSED</Chip>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 10,
          }}
        >
          The host has closed this list for now.
        </p>
      </div>
    );
  }

  return (
    <div className="w-card" style={{ padding: 18 }}>
      <div className="w-type-meta">ADD A NAME</div>
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 12,
        }}
      >
        <div>
          <label htmlFor="fullName" className="w-label">
            FULL NAME
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-input"
            placeholder="Guest full name"
            required
          />
        </div>

        {plusOnesAllowed && (
          <div>
            <label htmlFor="plusOnes" className="w-label">
              +1S
            </label>
            <input
              id="plusOnes"
              type="number"
              min={0}
              max={10}
              value={plusOnes}
              onChange={(e) => setPlusOnes(e.target.value)}
              className="w-input"
            />
          </div>
        )}

        {error ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {added ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)" }}
            role="status"
          >
            Added{" "}
            <strong style={{ color: "var(--w-fg)" }}>{added}</strong>.
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={pending}
        >
          {pending ? "Adding…" : "Add to list"}
        </Button>
      </form>
    </div>
  );
}
