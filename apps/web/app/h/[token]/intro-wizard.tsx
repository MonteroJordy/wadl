"use client";

import { useEffect, useState } from "react";

interface Props {
  holderName: string;
  cap: number;
  autoApprove: boolean;
  plusOnesAllowed: boolean;
  /** Stable per-token key so dismissal sticks to this allocation, not all. */
  token: string;
  /** When true, pretend there's no localStorage flag and force-show. */
  force?: boolean;
}

const CARDS = [
  {
    title: "You're a holder.",
    body: "The host gave you a slice of the door. Your name shows up next to every guest you add — credit + accountability flow back to you automatically.",
  },
  {
    title: "Add names, no account needed.",
    body: "Type or paste names below. Each goes on the door list under your name. The host sees who added whom, and your show rate gets graded after every event.",
  },
  {
    title: "Tier matters.",
    body: "GA, VIP, or All Access. The door treats them differently. Default is GA — bump people up only when the host gave you that lane.",
  },
  {
    title: "Approval flow.",
    body: "Some lists auto-approve. Others wait for the host to confirm. You'll see status next to every name you submit — green = in, gold = pending.",
  },
  {
    title: "Show up well.",
    body: "Show rate = how many of your adds actually walked in. The higher it is, the bigger your cap next time. Keep your list real, your numbers will follow.",
  },
];

export default function HolderIntroWizard({
  holderName,
  cap,
  autoApprove,
  plusOnesAllowed,
  token,
  force,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const storageKey = `wadl-h-intro-seen:${token}`;

  useEffect(() => {
    if (force) {
      setOpen(true);
      return;
    }
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (!seen) setOpen(true);
    } catch {
      // Privacy mode / cookies blocked → just show once.
      setOpen(true);
    }
  }, [force, storageKey]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const isFirst = step === 0;
  const isLast = step === CARDS.length - 1;
  const card = CARDS[step];

  // Replace placeholder copy on first card with allocation specifics.
  const firstBody = `Welcome${holderName ? `, ${holderName}` : ""}. Your cap is ${cap} ${plusOnesAllowed ? "(plus-ones allowed)" : "(no plus-ones)"} · ${autoApprove ? "auto-approve on" : "host approves"}.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hwiz-title"
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <div className="bg-s1 border border-line rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 pb-7">
        <div className="flex items-center justify-between mb-3">
          <p className="label-mono">
            {step + 1} of {CARDS.length}
          </p>
          <button
            onClick={dismiss}
            className="label-mono hover:text-cream"
            type="button"
          >
            Skip
          </button>
        </div>

        <div className="flex gap-1 mb-5">
          {CARDS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i <= step ? "bg-coral" : "bg-s3"
              }`}
            />
          ))}
        </div>

        <h2
          id="hwiz-title"
          className="font-display text-3xl text-cream uppercase tracking-wide leading-[0.95] mb-3"
        >
          {card.title}
        </h2>
        <p className="text-cream/80 text-sm leading-relaxed mb-6">
          {isFirst ? firstBody : card.body}
        </p>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-ghost flex-1"
              type="button"
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1"
              type="button"
            >
              Next
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="btn-primary flex-1"
              type="button"
            >
              Start adding names
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
