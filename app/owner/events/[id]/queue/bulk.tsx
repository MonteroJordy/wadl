"use client";

import { useTransition } from "react";
import { approveAllAction, rejectAllAction } from "./actions";

export default function BulkActions({
  eventId,
  nightId,
  count,
}: {
  eventId: string;
  nightId: string;
  count: number;
}) {
  const [pending, startTransition] = useTransition();

  function approveAll() {
    if (!confirm(`Approve all ${count} pending on this night?`)) return;
    startTransition(async () => {
      await approveAllAction(eventId, nightId);
    });
  }
  function denyAll() {
    if (!confirm(`Deny all ${count} pending on this night?`)) return;
    startTransition(async () => {
      await rejectAllAction(eventId, nightId);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <button
        type="button"
        onClick={denyAll}
        disabled={pending}
        className="btn-ghost disabled:opacity-40"
      >
        Deny all
      </button>
      <button
        type="button"
        onClick={approveAll}
        disabled={pending}
        className="btn-primary disabled:opacity-40"
      >
        Approve all
      </button>
    </div>
  );
}
