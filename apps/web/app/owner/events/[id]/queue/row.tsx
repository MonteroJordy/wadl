"use client";

import { useTransition } from "react";
import { Button } from "@/components/wadl";
import { approveGuestAction, rejectGuestAction } from "./actions";

export default function QueueRow({
  eventId,
  guestId,
  fullName,
  plusOnes,
  holderLabel,
  addedAgo,
}: {
  eventId: string;
  guestId: string;
  fullName: string;
  plusOnes: number;
  holderLabel: string;
  addedAgo: string;
}) {
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      await approveGuestAction(eventId, guestId);
    });
  }
  function reject() {
    startTransition(async () => {
      await rejectGuestAction(eventId, guestId);
    });
  }

  return (
    <div className="w-card" style={{ padding: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              color: "var(--w-fg)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fullName}
            {plusOnes > 0 && (
              <span
                style={{
                  color: "var(--w-fg-muted)",
                  fontWeight: 400,
                }}
              >
                {" "}
                +{plusOnes}
              </span>
            )}
          </p>
          <div
            className="w-type-meta"
            style={{
              marginTop: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {holderLabel} · {addedAgo}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 12,
        }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={reject}
          disabled={pending}
        >
          Deny
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={approve}
          disabled={pending}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
