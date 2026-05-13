"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/wadl";
import {
  managerApproveGuestAction,
  managerRejectGuestAction,
} from "./actions";
import { manualCheckInAction } from "../../../door/events/[id]/search/actions";

interface Props {
  eventId: string;
  guest: {
    id: string;
    full_name: string;
    plus_ones: number;
    tier: string;
    status: string;
    flag_dna: boolean;
    allocation_name: string | null;
    checked_in_at: string | null;
  };
}

const STATUS_COLOR: Record<string, string> = {
  approved: "var(--w-ok)",
  pending: "var(--w-warn)",
  rejected: "var(--w-err)",
};

export default function GuestRow({ eventId, guest }: Props) {
  const [pending, startTransition] = useTransition();
  const checkedIn = Boolean(guest.checked_in_at);

  function approve() {
    startTransition(async () => {
      await managerApproveGuestAction(eventId, guest.id);
    });
  }
  function reject() {
    startTransition(async () => {
      await managerRejectGuestAction(eventId, guest.id);
    });
  }
  function checkIn() {
    startTransition(async () => {
      await manualCheckInAction(eventId, guest.id);
    });
  }

  return (
    <div
      className="w-card"
      style={{
        padding: 14,
        borderColor: guest.flag_dna ? "var(--w-err)" : undefined,
        opacity: checkedIn ? 0.6 : 1,
      }}
    >
      <Link
        href={`/manager/events/${eventId}/guests/${guest.id}`}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
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
              {guest.full_name}
              {guest.plus_ones > 0 && (
                <span
                  style={{
                    color: "var(--w-fg-muted)",
                    fontWeight: 400,
                  }}
                >
                  {" "}
                  +{guest.plus_ones}
                </span>
              )}
              {guest.flag_dna && (
                <span
                  className="w-type-meta"
                  style={{ marginLeft: 8, color: "var(--w-err)" }}
                >
                  ⚠ DNA
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
              <span
                style={{
                  color:
                    STATUS_COLOR[guest.status] ?? "var(--w-fg-muted)",
                }}
              >
                {guest.status.toUpperCase()}
              </span>
              {" · "}
              {guest.tier.toUpperCase()}
              {guest.allocation_name && <> · {guest.allocation_name}</>}
              {checkedIn && (
                <>
                  {" · "}
                  <span style={{ color: "var(--w-ok)" }}>
                    IN {new Date(guest.checked_in_at!).toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {!checkedIn && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 12,
          }}
        >
          {guest.status === "pending" ? (
            <>
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
            </>
          ) : guest.status === "approved" ? (
            <Button
              variant="primary"
              type="button"
              onClick={checkIn}
              disabled={pending || guest.flag_dna}
              style={{ gridColumn: "1 / -1" }}
            >
              Check in
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
