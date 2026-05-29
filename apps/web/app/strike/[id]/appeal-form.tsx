"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAppealAction } from "./actions";

interface Reason {
  key: "i_was_there" | "couldnt_get_in" | "plans_changed";
  h: string;
  d: string;
}

const REASONS: Reason[] = [
  { key: "i_was_there", h: "I was there", d: "We'll cross-check door logs." },
  { key: "couldnt_get_in", h: "Couldn't get in", d: "Staff will review." },
  { key: "plans_changed", h: "Plans changed", d: "Honest. Strike stays." },
];

export default function AppealForm({ guestId }: { guestId: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Reason["key"] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (!picked) return;
    startTransition(async () => {
      await submitAppealAction({ guestId, reason: picked });
      setSubmitted(true);
      window.setTimeout(() => router.push("/mytickets"), 1400);
    });
  }

  if (submitted) {
    return (
      <div className="card" style={{ padding: "var(--s-5)", textAlign: "center" }}>
        <span className="chip chip--ok">Appeal logged</span>
        <p
          className="t-body-2"
          style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
        >
          The venue will review within 48h.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-2)",
      }}
    >
      {REASONS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setPicked(r.key)}
          className="card"
          style={{
            padding: "var(--s-4)",
            cursor: "pointer",
            textAlign: "left",
            background: picked === r.key ? "var(--accent-soft)" : undefined,
            borderColor:
              picked === r.key ? "var(--accent-1)" : "var(--line)",
          }}
        >
          <div className="t-h2">{r.h}</div>
          <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
            {r.d}
          </div>
        </button>
      ))}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!picked || pending}
        className="btn btn--lg btn--accent btn--block"
        style={{ marginTop: "var(--s-3)" }}
      >
        {pending ? "Submitting…" : "Submit appeal"}
      </button>
    </div>
  );
}
