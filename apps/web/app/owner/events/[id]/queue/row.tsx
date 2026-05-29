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
    <div
      className="row"
      style={{ gridTemplateColumns: "1fr 160px 100px 200px" }}
    >
      <span className="t-h1 truncate">
        {fullName}
        {plusOnes > 0 && (
          <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
            {" "}
            +{plusOnes}
          </span>
        )}
      </span>
      <span className="t-body-2 truncate">{holderLabel}</span>
      <span className="t-meta">{addedAgo}</span>
      <div
        style={{
          display: "flex",
          gap: "var(--s-2)",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={reject}
          disabled={pending}
        >
          Deny
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={approve}
          disabled={pending}
        >
          Approve
        </button>
      </div>
    </div>
  );
}
