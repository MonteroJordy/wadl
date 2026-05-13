"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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
      <div className="w-type-meta" style={{ color: "var(--w-fg-muted)" }}>
        NO PHONE — CAN&apos;T DM.
      </div>
    );
  }
  if (optedOut) {
    return (
      <div className="w-type-meta" style={{ color: "var(--w-err)" }}>
        OPTED OUT OF SMS.
      </div>
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
      <Button variant="ghost" type="button" onClick={() => setOpen(true)}>
        Message {guestName.split(" ")[0]} via SMS
      </Button>
    );
  }

  return (
    <div
      className="w-card"
      style={{ padding: 14, borderColor: "var(--w-acc)" }}
    >
      <div className="w-type-meta" style={{ marginBottom: 8 }}>
        DIRECT SMS
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={320}
        placeholder={`Hey ${guestName.split(" ")[0]}, …`}
        style={{
          width: "100%",
          background: "var(--w-surface-1)",
          border: "1px solid var(--w-line)",
          color: "var(--w-fg)",
          padding: "10px 12px",
          fontFamily: "var(--w-sans)",
          fontSize: 14,
          minHeight: 96,
        }}
      />
      <div className="w-type-meta" style={{ marginTop: 8 }}>
        {body.length}/320 · CHARGED AT STANDARD SMS RATE
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 12,
        }}
      >
        <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={send}
          disabled={pending || !body.trim()}
        >
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
