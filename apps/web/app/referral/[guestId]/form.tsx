"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import { addReferralAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
        className="w-card"
        style={{ padding: 16, textAlign: "center" }}
      >
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          CLOSED
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
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
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <label
          htmlFor="rname"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          FRIEND&apos;S FULL NAME
        </label>
        <input
          id="rname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={INPUT_STYLE}
          placeholder="Their full name"
          required
        />
      </div>
      {plusOnesAllowed && (
        <div>
          <label
            htmlFor="rplus"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 6 }}
          >
            +1S
          </label>
          <input
            id="rplus"
            type="number"
            min={0}
            max={4}
            value={plus}
            onChange={(e) => setPlus(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>
      )}
      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </p>
      )}
      {added && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-ok)" }}
        >
          Added <span style={{ color: "var(--w-fg)" }}>{added}</span> to the
          list.
        </p>
      )}
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add friend"}
      </Button>
    </form>
  );
}
