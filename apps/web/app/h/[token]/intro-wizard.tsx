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

  const firstBody = `Welcome${holderName ? `, ${holderName}` : ""}. Your cap is ${cap} ${plusOnesAllowed ? "(plus-ones allowed)" : "(no plus-ones)"} · ${autoApprove ? "auto-approve on" : "host approves"}.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hwiz-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "var(--s-4)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "var(--s-6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-3)",
          }}
        >
          <div className="t-meta">
            {step + 1} of {CARDS.length}
          </div>
          <button
            onClick={dismiss}
            type="button"
            className="t-meta"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--fg-3)",
              padding: 0,
            }}
          >
            Skip
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--s-1)",
            marginBottom: "var(--s-5)",
          }}
        >
          {CARDS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: "var(--r-pill)",
                background: i <= step ? "var(--fg)" : "var(--bg-4)",
              }}
            />
          ))}
        </div>

        <h2
          id="hwiz-title"
          className="t-display-sm"
          style={{ marginBottom: "var(--s-3)" }}
        >
          {card.title}
        </h2>
        <p
          className="t-body-2"
          style={{ marginBottom: "var(--s-6)" }}
        >
          {isFirst ? firstBody : card.body}
        </p>

        <div style={{ display: "flex", gap: "var(--s-2)" }}>
          {step > 0 && (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setStep(step - 1)}
              style={{ flex: 1 }}
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              className="btn"
              type="button"
              onClick={() => setStep(step + 1)}
              style={{ flex: 1 }}
            >
              Next
            </button>
          ) : (
            <button
              className="btn"
              type="button"
              onClick={dismiss}
              style={{ flex: 1 }}
            >
              Start adding names
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
