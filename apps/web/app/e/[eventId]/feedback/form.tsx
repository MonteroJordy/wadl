"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/wadl";
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
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <section className="w-card" style={{ padding: 18 }}>
        <div className="w-type-meta" style={{ marginBottom: 12 }}>
          OVERALL RATING
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
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
                  border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
                  background: active
                    ? "var(--w-acc-soft)"
                    : "var(--w-surface-1)",
                  color: active ? "var(--w-acc)" : "var(--w-fg-muted)",
                  fontSize: 30,
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

      <section className="w-card" style={{ padding: 18 }}>
        <div className="w-type-meta" style={{ marginBottom: 12 }}>
          WHAT STOOD OUT? (OPTIONAL)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAGS.map((t) => {
            const on = tags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTag(t.key)}
                style={{
                  padding: "4px 12px",
                  border: `1px solid ${on ? "var(--w-acc)" : "var(--w-line)"}`,
                  background: on
                    ? "var(--w-acc-soft)"
                    : "var(--w-surface-1)",
                  color: on ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                  fontFamily: "var(--w-mono)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-card" style={{ padding: 18 }}>
        <label
          htmlFor="fb-comment"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          ANYTHING ELSE? (OPTIONAL)
        </label>
        <textarea
          id="fb-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Stays between you and the venue."
          style={{
            width: "100%",
            background: "var(--w-surface-1)",
            border: "1px solid var(--w-line)",
            color: "var(--w-fg)",
            padding: 12,
            fontSize: 14,
            fontFamily: "var(--w-sans)",
          }}
        />
        <div
          className="w-type-meta"
          style={{ marginTop: 4, textAlign: "right" }}
        >
          {comment.length}/1000
        </div>
      </section>

      {error && (
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </div>
      )}

      <Button
        variant="primary"
        type="submit"
        disabled={pending || rating < 1}
        style={{ width: "100%" }}
      >
        {pending ? "Sending…" : "Submit feedback"}
      </Button>
      {guestId && (
        <div className="w-type-meta" style={{ textAlign: "center" }}>
          LINKED TO YOUR TICKET · COUNTS ONCE
        </div>
      )}
    </form>
  );
}
