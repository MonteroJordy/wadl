"use client";

import { useState, useTransition } from "react";
import {
  updateGuestNotesAction,
  updateGuestTagsAction,
  PRESET_TAGS,
} from "@/lib/guest-extras";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

export default function GuestNotesTags({
  guestId,
  initialNotes,
  initialTags,
}: {
  guestId: string;
  initialNotes: string;
  initialTags: string[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveNotes() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await updateGuestNotesAction(guestId, notes);
      if (!res.ok) setError(res.error);
      else setSaved("Notes saved.");
    });
  }

  function saveTags(next: string[]) {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await updateGuestTagsAction(guestId, next);
      if (!res.ok) setError(res.error);
      else setSaved("Tags saved.");
    });
  }

  function commitToggle(tag: string) {
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    setTags(next);
    saveTags(next);
  }

  function commitAddCustom() {
    const t = customTag.trim();
    if (!t || tags.includes(t)) {
      setCustomTag("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setCustomTag("");
    saveTags(next);
  }

  return (
    <section className="w-card" style={{ padding: 16 }}>
      <div className="w-type-meta" style={{ marginBottom: 8 }}>
        TAGS
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {[...new Set([...PRESET_TAGS, ...tags])].map((tag) => {
          const active = tags.includes(tag);
          const isPreset = (PRESET_TAGS as readonly string[]).includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => commitToggle(tag)}
              disabled={pending}
              style={{
                padding: "4px 12px",
                border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
                background: active
                  ? "var(--w-acc-soft)"
                  : "var(--w-surface-1)",
                color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                fontFamily: "var(--w-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontStyle: isPreset ? "normal" : "italic",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.5 : 1,
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitAddCustom();
            }
          }}
          placeholder="Add custom tag…"
          style={{ ...INPUT_STYLE, fontSize: 14 }}
        />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={commitAddCustom}
          disabled={pending || !customTag.trim()}
          style={{ padding: "0 18px" }}
        >
          Add
        </button>
      </div>

      <div className="w-type-meta" style={{ marginBottom: 6 }}>
        NOTES
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        style={{ ...INPUT_STYLE, minHeight: 80, fontSize: 14 }}
        placeholder="Private notes — only your team sees these."
      />

      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 8 }}
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-ok)", marginTop: 8 }}
        >
          {saved}
        </p>
      )}
    </section>
  );
}
