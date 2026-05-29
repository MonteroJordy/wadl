"use client";

import { useTransition } from "react";
import { setTicketStatusAction } from "./actions";

const NEXT_STATUS: Record<
  string,
  "open" | "pending" | "resolved" | "closed"
> = {
  open: "pending",
  pending: "resolved",
  resolved: "closed",
  closed: "open",
};
const NEXT_LABEL: Record<string, string> = {
  open: "Mark pending",
  pending: "Resolve",
  resolved: "Close",
  closed: "Reopen",
};

export default function StatusButton({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[currentStatus] ?? "open";
  const label = NEXT_LABEL[currentStatus] ?? "Cycle";

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await setTicketStatusAction(ticketId, next);
        });
      }}
      disabled={pending}
      className="btn btn--ghost btn--sm"
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      {pending ? "…" : label}
    </button>
  );
}
