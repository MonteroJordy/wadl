"use client";

import { useState, useTransition } from "react";
import {
  updateGuestNotesAction,
  updateGuestTagsAction,
  PRESET_TAGS,
} from "@/lib/guest-extras";

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

  function toggleTag(tag: string) {
    setTags((ts) =>
      ts.includes(tag) ? ts.filter((t) => t !== tag) : [...ts, tag]
    );
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    setTags((ts) => [...ts, t]);
    setCustomTag("");
  }

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
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
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
    <section className="card">
      <p className="label-mono mb-2">Tags</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {[...new Set([...PRESET_TAGS, ...tags])].map((tag) => {
          const active = tags.includes(tag);
          const isPreset = (PRESET_TAGS as readonly string[]).includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => commitToggle(tag)}
              disabled={pending}
              className={`px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition ${
                active
                  ? "border-coral bg-coral/10 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              } ${isPreset ? "" : "italic"}`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mb-4">
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
          className="input-dark text-sm"
        />
        <button
          type="button"
          onClick={commitAddCustom}
          disabled={pending || !customTag.trim()}
          className="btn-ghost w-auto px-4 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <p className="label-mono mb-2">Notes</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        className="input-dark min-h-[80px] text-sm"
        placeholder="Private notes — only your team sees these."
      />

      {error && <p className="text-err text-sm mt-2">{error}</p>}
      {saved && <p className="text-mint text-sm mt-2">{saved}</p>}
    </section>
  );
}
