"use client";

import { useState, useTransition } from "react";
import {
  updateAllocationAction,
  regenerateTokenAction,
} from "./actions";

interface Props {
  eventId: string;
  allocId: string;
  initial: {
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
  holderUrl: string;
}

export default function AllocationControls({
  eventId,
  allocId,
  initial,
  holderUrl,
}: Props) {
  const [cap, setCap] = useState(String(initial.cap));
  const [autoApprove, setAutoApprove] = useState(initial.auto_approve);
  const [listOpen, setListOpen] = useState(initial.list_open);
  const [plusOnes, setPlusOnes] = useState(initial.plus_ones_allowed);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    const capNum = parseInt(cap, 10);
    if (!capNum || capNum < 1) return setError("Cap must be at least 1.");

    startTransition(async () => {
      const res = await updateAllocationAction(eventId, allocId, {
        cap: capNum,
        auto_approve: autoApprove,
        list_open: listOpen,
        plus_ones_allowed: plusOnes,
      });
      if (res?.error) setError(res.error);
      else setSaved("Saved.");
    });
  }

  function onRegenerate() {
    if (!confirm("Revoke current link and create a new one?")) return;
    startTransition(async () => {
      const res = await regenerateTokenAction(eventId, allocId);
      if (res?.error) setError(res.error);
      else setSaved("Link rotated.");
    });
  }

  function onCopy() {
    navigator.clipboard.writeText(holderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <section className="card mb-5">
        <p className="label-mono mb-2">Magic link</p>
        <div className="flex items-center gap-2">
          <input
            value={holderUrl}
            readOnly
            className="input-dark text-xs font-mono truncate"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" onClick={onCopy} className="btn-ghost w-auto px-4">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="label-mono mt-3 text-coral hover:brightness-125"
        >
          Rotate link →
        </button>
      </section>

      <form onSubmit={onSave} className="flex flex-col gap-5">
        <div>
          <label htmlFor="cap" className="label-mono block mb-2">Cap</label>
          <input
            id="cap"
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="input-dark"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="w-5 h-5 accent-coral"
          />
          <span className="font-sans text-cream text-sm font-semibold">Auto-approve</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={listOpen}
            onChange={(e) => setListOpen(e.target.checked)}
            className="w-5 h-5 accent-coral"
          />
          <span className="font-sans text-cream text-sm font-semibold">List open</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={plusOnes}
            onChange={(e) => setPlusOnes(e.target.checked)}
            className="w-5 h-5 accent-coral"
          />
          <span className="font-sans text-cream text-sm font-semibold">Allow +1s</span>
        </label>

        {error && <p className="text-coral text-sm">{error}</p>}
        {saved && <p className="text-mint text-sm">{saved}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </>
  );
}
