"use client";

import { useState, useTransition } from "react";
import { cancelGuestAction } from "@/app/owner/events/[id]/waitlist/actions";

export default function GuestCancelButton({
  eventId,
  guestId,
  status,
}: {
  eventId: string;
  guestId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ promoted: boolean } | null>(null);

  if (status === "cancelled" || status === "rejected") return null;

  function onClick() {
    if (
      !confirm(
        "Cancel this guest? If they were approved, the oldest waitlisted guest will be auto-promoted (and SMS'd)."
      )
    )
      return;
    startTransition(async () => {
      const res = await cancelGuestAction(eventId, guestId);
      if ("ok" in res && res.ok) {
        setDone({ promoted: !!res.promotedId });
      }
    });
  }

  if (done) {
    return (
      <p className="label-mono text-mint">
        Cancelled.{done.promoted ? " Waitlist auto-promoted." : ""}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn-ghost border-coral/40 text-coral disabled:opacity-50"
    >
      {pending ? "Cancelling…" : "Cancel guest"}
    </button>
  );
}
