"use client";

import { useState, useTransition } from "react";
import { deletePartnerAction } from "./actions";
import ConfirmDialog from "@/components/confirm-dialog";

export default function DeletePartnerButton({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function doDelete() {
    startTransition(async () => {
      await deletePartnerAction(partnerId);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "var(--w-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--w-fg-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--w-err)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--w-fg-muted)";
        }}
        aria-label={`Delete ${partnerName}`}
      >
        {pending ? "…" : "Remove"}
      </button>
      <ConfirmDialog
        open={open}
        title={`Remove "${partnerName}"?`}
        body="They'll drop off your partners list. You can add them again any time."
        confirmLabel="Remove"
        danger
        pending={pending}
        onConfirm={doDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
