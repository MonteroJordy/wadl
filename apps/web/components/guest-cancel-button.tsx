"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import ConfirmDialog from "@/components/confirm-dialog";
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
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{ promoted: boolean } | null>(null);

  if (status === "cancelled" || status === "rejected") return null;

  function doCancel() {
    startTransition(async () => {
      const res = await cancelGuestAction(eventId, guestId);
      if ("ok" in res && res.ok) {
        setDone({ promoted: !!res.promotedId });
      }
      setOpen(false);
    });
  }

  if (done) {
    return (
      <div className="w-type-meta" style={{ color: "var(--w-ok)" }}>
        CANCELLED.{done.promoted ? " WAITLIST AUTO-PROMOTED." : ""}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        style={{
          borderColor: "var(--w-err)",
          color: "var(--w-err)",
        }}
      >
        {pending ? "Cancelling…" : "Cancel guest"}
      </Button>
      <ConfirmDialog
        open={open}
        title="Cancel this guest?"
        body="If they were approved, the oldest waitlisted guest auto-promotes and gets an SMS. The cancel stays in the audit log."
        confirmLabel="Cancel guest"
        danger
        pending={pending}
        onConfirm={doCancel}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
