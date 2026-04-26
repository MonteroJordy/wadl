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
      cur.includes(key) ? cur.filter((t) => t !== key) : [...cur, key]
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <section className="card">
        <p className="label-mono mb-3">Overall rating</p>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = rating >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`flex-1 aspect-square rounded-2xl border text-3xl ${
                  active
                    ? "border-coral bg-coral/10 text-coral"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
                aria-label={`${n} of 5 stars`}
              >
                ★
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">What stood out? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const on = tags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTag(t.key)}
                className={`px-3 py-1 rounded-full border text-xs font-mono uppercase tracking-wider ${
                  on
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <label className="label-mono block mb-2" htmlFor="fb-comment">
          Anything else? (optional)
        </label>
        <textarea
          id="fb-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Stays between you and the venue."
          className="w-full bg-s1 border border-line rounded-lg p-3 text-cream text-sm font-sans focus:border-coral focus:outline-none"
        />
        <p className="label-mono mt-1 text-right">{comment.length}/1000</p>
      </section>

      {error && <p className="label-mono text-coral">{error}</p>}

      <button
        type="submit"
        disabled={pending || rating < 1}
        className="btn-primary w-full disabled:opacity-50"
      >
        {pending ? "Sending…" : "Submit feedback"}
      </button>
      {guestId && (
        <p className="label-mono text-center">
          Linked to your ticket · counts once
        </p>
      )}
    </form>
  );
}
