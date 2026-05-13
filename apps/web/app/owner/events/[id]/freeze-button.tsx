"use client";

import { useTransition } from "react";
import { Button } from "@/components/wadl";
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
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        width: "100%",
        ...(frozen
          ? {
              borderColor: "var(--w-err)",
              color: "var(--w-err)",
            }
          : {}),
      }}
    >
      {pending
        ? "Updating…"
        : frozen
          ? "Frozen — tap to unfreeze"
          : "Freeze this night"}
    </Button>
  );
}
