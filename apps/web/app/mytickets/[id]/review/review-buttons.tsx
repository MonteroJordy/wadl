"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReviewAction } from "./actions";

const OPTIONS: Array<{ key: "loved" | "good" | "meh"; label: string; tone: string }> = [
  { key: "loved", label: "Loved it", tone: "btn--accent" },
  { key: "good", label: "Good", tone: "btn--ghost" },
  { key: "meh", label: "Meh", tone: "btn--ghost" },
];

export default function ReviewButtons({
  guestId,
  eventId,
}: {
  guestId: string;
  eventId: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<"loved" | "good" | "meh" | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(key: "loved" | "good" | "meh") {
    setPicked(key);
    startTransition(async () => {
      await submitReviewAction({ guestId, eventId, rating: key });
      // Done — bounce back to mytickets after a beat
      setTimeout(() => router.push("/mytickets"), 800);
    });
  }

  if (picked) {
    return (
      <div className="card" style={{ padding: "var(--s-5)", textAlign: "center" }}>
        <span className="chip chip--ok">Thanks</span>
        <p
          className="t-body-2"
          style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
        >
          Your reply was sent to the venue.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "var(--s-2)" }}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          disabled={pending}
          className={`btn btn--block ${o.tone}`}
          style={{ flex: 1 }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
