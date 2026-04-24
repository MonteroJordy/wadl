"use client";

import { useTransition } from "react";
import { toggleFreezeAction } from "./actions";

export default function FreezeButton({
  eventId,
  nightId,
  frozen,
}: {
  eventId: string;
  nightId: string;
  frozen: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await toggleFreezeAction(eventId, nightId, !frozen);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`w-full border rounded-md py-3 font-sans text-sm uppercase tracking-[0.14em] transition ${
        frozen
          ? "bg-coral text-bg border-coral"
          : "bg-transparent text-cream border-line hover:border-coral"
      }`}
    >
      {pending
        ? "Updating…"
        : frozen
        ? "Frozen — tap to unfreeze"
        : "Freeze this night"}
    </button>
  );
}
