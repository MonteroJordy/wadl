"use client";

import { useTransition } from "react";
import { setTicketStatusAction } from "./actions";

const NEXT_STATUS: Record<string, "open" | "pending" | "resolved" | "closed"> = {
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
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-line bg-s2 text-cream text-[10px] font-mono uppercase tracking-wider hover:border-coral transition disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
