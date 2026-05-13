"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
import { revokeInviteAction, removeStaffAction } from "./actions";

const INLINE_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  fontFamily: "var(--w-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function RevokeInviteButton({
  eventId,
  inviteId,
}: {
  eventId: string;
  inviteId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        style={{
          ...INLINE_BTN,
          color: "var(--w-err)",
          opacity: pending ? 0.4 : 1,
        }}
      >
        Revoke
      </button>
      <ConfirmDialog
        open={open}
        title="Revoke this invite?"
        body="The link they got will stop working. You can re-invite them later."
        confirmLabel="Revoke"
        danger
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await revokeInviteAction(eventId, inviteId);
            setOpen(false);
          })
        }
      />
    </>
  );
}

export function RemoveStaffButton({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        style={{
          ...INLINE_BTN,
          color: "var(--w-err)",
          opacity: pending ? 0.4 : 1,
        }}
      >
        Remove
      </button>
      <ConfirmDialog
        open={open}
        title="Remove this staff member?"
        body="They lose access to this event's door scanner and queue. Their scan history stays in the audit log."
        confirmLabel="Remove"
        danger
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await removeStaffAction(eventId, userId);
            setOpen(false);
          })
        }
      />
    </>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        ...INLINE_BTN,
        color: copied ? "var(--w-ok)" : "var(--w-fg-muted)",
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
