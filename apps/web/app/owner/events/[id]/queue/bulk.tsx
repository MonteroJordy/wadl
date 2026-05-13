"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import ConfirmDialog from "@/components/confirm-dialog";
import { approveAllAction, rejectAllAction } from "./actions";

type Pending = "approve" | "deny" | null;

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
  const [confirmKind, setConfirmKind] = useState<Pending>(null);

  function run(kind: Exclude<Pending, null>) {
    startTransition(async () => {
      if (kind === "approve") await approveAllAction(eventId, nightId);
      else await rejectAllAction(eventId, nightId);
      setConfirmKind(null);
    });
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={() => setConfirmKind("deny")}
          disabled={pending}
        >
          Deny all
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={() => setConfirmKind("approve")}
          disabled={pending}
        >
          Approve all
        </Button>
      </div>
      <ConfirmDialog
        open={confirmKind !== null}
        title={
          confirmKind === "approve"
            ? `Approve all ${count}?`
            : `Deny all ${count}?`
        }
        body={
          confirmKind === "approve"
            ? "Everyone on the waitlist for this night gets a yes. You can override individual guests later."
            : "Everyone on the waitlist for this night gets a no. They'll see the reject in their thread."
        }
        confirmLabel={confirmKind === "approve" ? "Approve all" : "Deny all"}
        danger={confirmKind === "deny"}
        pending={pending}
        onConfirm={() => {
          if (confirmKind) run(confirmKind);
        }}
        onCancel={() => setConfirmKind(null)}
      />
    </>
  );
}
