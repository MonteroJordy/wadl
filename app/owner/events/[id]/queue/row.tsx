"use client";

import { useTransition } from "react";
import { approveGuestAction, rejectGuestAction } from "./actions";

export default function QueueRow({
  eventId,
  guestId,
  fullName,
  plusOnes,
  holderLabel,
  addedAgo,
}: {
  eventId: string;
  guestId: string;
  fullName: string;
  plusOnes: number;
  holderLabel: string;
  addedAgo: string;
}) {
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      await approveGuestAction(eventId, guestId);
    });
  }
  function reject() {
    startTransition(async () => {
      await rejectGuestAction(eventId, guestId);
    });
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-cream font-semibold truncate">
            {fullName}
            {plusOnes > 0 && (
              <span className="text-muted font-normal"> +{plusOnes}</span>
            )}
          </p>
          <p className="label-mono mt-1 truncate">
            {holderLabel} · {addedAgo}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          onClick={reject}
          disabled={pending}
          className="bg-s3 text-cream font-sans text-sm uppercase tracking-[0.14em] py-2 rounded-md border border-line hover:border-coral disabled:opacity-40"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="bg-coral text-bg font-sans text-sm font-semibold uppercase tracking-[0.14em] py-2 rounded-md disabled:opacity-40"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
