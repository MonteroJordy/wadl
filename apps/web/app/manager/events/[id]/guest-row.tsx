"use client";

import Link from "next/link";
import { useTransition } from "react";
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
  approved: "var(--ok)",
  pending: "var(--warn)",
  rejected: "var(--err)",
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
      className="card"
      style={{
        padding: "var(--s-4)",
        borderColor: guest.flag_dna ? "var(--err)" : undefined,
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
            gap: "var(--s-3)",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              className="t-h2 truncate"
              style={{ color: "var(--fg)" }}
            >
              {guest.full_name}
              {guest.plus_ones > 0 && (
                <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
                  {" "}
                  +{guest.plus_ones}
                </span>
              )}
              {guest.flag_dna && (
                <span
                  className="t-meta"
                  style={{ marginLeft: "var(--s-2)", color: "var(--err)" }}
                >
                  ⚠ DNA
                </span>
              )}
            </p>
            <div
              className="t-meta truncate"
              style={{ marginTop: "var(--s-1)" }}
            >
              <span
                style={{
                  color: STATUS_COLOR[guest.status] ?? "var(--fg-3)",
                }}
              >
                {guest.status}
              </span>
              {" · "}
              {guest.tier}
              {guest.allocation_name && <> · {guest.allocation_name}</>}
              {checkedIn && (
                <>
                  {" · "}
                  <span style={{ color: "var(--ok)" }}>
                    In {new Date(guest.checked_in_at!).toLocaleTimeString()}
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
            gap: "var(--s-2)",
            marginTop: "var(--s-3)",
          }}
        >
          {guest.status === "pending" ? (
            <>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={reject}
                disabled={pending}
              >
                Deny
              </button>
              <button
                className="btn"
                type="button"
                onClick={approve}
                disabled={pending}
              >
                Approve
              </button>
            </>
          ) : guest.status === "approved" ? (
            <button
              className="btn"
              type="button"
              onClick={checkIn}
              disabled={pending || guest.flag_dna}
              style={{ gridColumn: "1 / -1" }}
            >
              Check in
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
