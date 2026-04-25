"use client";

import { useState, useTransition } from "react";
import { revokeInviteAction, removeStaffAction } from "./actions";

export function RevokeInviteButton({
  eventId,
  inviteId,
}: {
  eventId: string;
  inviteId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Revoke this invite?")) return;
        startTransition(async () => {
          await revokeInviteAction(eventId, inviteId);
        });
      }}
      className="label-mono text-coral hover:brightness-125 disabled:opacity-40"
    >
      Revoke
    </button>
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
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this staff member from the event?")) return;
        startTransition(async () => {
          await removeStaffAction(eventId, userId);
        });
      }}
      className="label-mono text-coral hover:brightness-125 disabled:opacity-40"
    >
      Remove
    </button>
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
      className="label-mono hover:text-cream transition"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
