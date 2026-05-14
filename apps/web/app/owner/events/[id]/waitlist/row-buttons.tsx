"use client";

import { useTransition } from "react";
import { manualPromoteAction } from "./actions";

export default function PromoteButton({
  eventId,
  guestId,
}: {
  eventId: string;
  guestId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await manualPromoteAction(eventId, guestId);
        });
      }}
      className="btn btn--sm"
    >
      {pending ? "…" : "Promote"}
    </button>
  );
}
