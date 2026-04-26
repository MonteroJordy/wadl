"use client";

import { useState, useTransition } from "react";
import { sendGuestDmAction } from "@/lib/guest-dm";
import { useToast } from "@/components/toast";

export default function GuestDmButton({
  guestId,
  guestName,
  hasPhone,
  optedOut,
}: {
  guestId: string;
  guestName: string;
  hasPhone: boolean;
  optedOut: boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  if (!hasPhone) {
    return (
      <p className="label-mono text-muted">No phone — can&apos;t DM.</p>
    );
  }
  if (optedOut) {
    return (
      <p className="label-mono text-coral">Opted out of SMS.</p>
    );
  }

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await sendGuestDmAction(guestId, body);
      if (res.ok) {
        toast.success("Sent.");
        setBody("");
        setOpen(false);
      } else toast.error(res.error);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost"
      >
        Message {guestName.split(" ")[0]} via SMS
      </button>
    );
  }

  return (
    <div className="card border-coral/40">
      <p className="label-mono mb-2">Direct SMS</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={320}
        placeholder={`Hey ${guestName.split(" ")[0]}, …`}
        className="input-dark min-h-[96px]"
      />
      <p className="label-mono mt-2">{body.length}/320 · charged at standard SMS rate</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={pending || !body.trim()}
          className="btn-primary"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
