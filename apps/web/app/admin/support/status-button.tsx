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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 12px",
        border: "1px solid var(--w-line)",
        background: "var(--w-surface-2)",
        color: "var(--w-fg)",
        fontFamily: "var(--w-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}
