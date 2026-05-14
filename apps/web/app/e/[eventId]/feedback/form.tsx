"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitFeedbackAction } from "./actions";

const TAGS = [
  { key: "music", label: "Music" },
  { key: "vibe", label: "Vibe" },
  { key: "door", label: "Door" },
  { key: "crowd", label: "Crowd" },
  { key: "drinks", label: "Drinks" },
  { key: "venue", label: "Venue" },
  { key: "value", label: "Value" },
];

export default function FeedbackForm({
  eventId,
  guestId,
  token,
}: {
  eventId: string;
  guestId: string | null;
  token: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(key: string) {
    setTags((cur) =>
      cur.includes(key) ? cur.filter((t) => t !== key) : [...cur, key],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Tap a star to rate the night.");
      return;
    }
    setPending(true);
    const res = await submitFeedbackAction({
      eventId,
      token,
      rating,
      tags,
      comment: comment.trim() || null,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(`/e/${eventId}/feedback?submitted=1`);
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}
    >
      <section className="card" style={{ padding: "var(--s-5)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          Overall rating
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--s-2)",
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = rating >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                style={{
                  flex: 1,
                  aspectRatio: "1 / 1",
                  borderRadius: "var(--r-md)",
                  border: `1px solid ${active ? "var(--fg)" : "var(--line-2)"}`,
                  background: active ? "var(--fg)" : "var(--bg-2)",
                  color: active ? "var(--bg)" : "var(--fg-3)",
                  fontSize: 28,
                  cursor: "pointer",
                }}
                aria-label={`${n} of 5 stars`}
              >
                ★
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ padding: "var(--s-5)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          What stood out? (optional)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
          {TAGS.map((t) => {
            const on = tags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTag(t.key)}
                className={on ? "chip chip--solid" : "chip"}
                style={{ cursor: "pointer", border: 0 }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ padding: "var(--s-5)" }}>
        <label
          htmlFor="fb-comment"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-2)" }}
        >
          Anything else? (optional)
        </label>
        <textarea
          id="fb-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Stays between you and the venue."
          className="input"
          style={{ height: "auto", padding: "var(--s-3)" }}
        />
        <div
          className="t-meta"
          style={{ marginTop: "var(--s-1)", textAlign: "right" }}
        >
          {comment.length}/1000
        </div>
      </section>

      {error && (
        <div className="t-meta" style={{ color: "var(--err)" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn--lg btn--block"
        disabled={pending || rating < 1}
      >
        {pending ? "Sending…" : "Submit feedback"}
      </button>
      {guestId && (
        <div className="t-meta" style={{ textAlign: "center" }}>
          Linked to your ticket · counts once
        </div>
      )}
    </form>
  );
}
