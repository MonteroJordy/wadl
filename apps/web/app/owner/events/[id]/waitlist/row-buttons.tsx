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
      className="bg-mint text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-3 rounded-md disabled:opacity-40 hover:brightness-110 transition shrink-0"
    >
      {pending ? "…" : "Promote"}
    </button>
  );
}
