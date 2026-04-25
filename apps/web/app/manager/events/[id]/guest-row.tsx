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

  const statusColor =
    guest.status === "approved"
      ? "text-mint"
      : guest.status === "pending"
      ? "text-gold"
      : guest.status === "rejected"
      ? "text-coral"
      : "text-muted";

  return (
    <div
      className={`card ${
        guest.flag_dna ? "border-coral" : checkedIn ? "opacity-60" : ""
      }`}
    >
      <Link
        href={`/manager/events/${eventId}/guests/${guest.id}`}
        className="block hover:opacity-90 transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-cream font-semibold truncate">
              {guest.full_name}
              {guest.plus_ones > 0 && (
                <span className="text-muted font-normal"> +{guest.plus_ones}</span>
              )}
              {guest.flag_dna && (
                <span className="ml-2 label-mono text-coral">⚠ DNA</span>
              )}
            </p>
            <p className="label-mono mt-1 truncate">
              <span className={statusColor}>{guest.status}</span>
              {" · "}
              {guest.tier.toUpperCase()}
              {guest.allocation_name && <> · {guest.allocation_name}</>}
              {checkedIn && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-mint">
                    IN {new Date(guest.checked_in_at!).toLocaleTimeString()}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </Link>

      {!checkedIn && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {guest.status === "pending" ? (
            <>
              <button
                type="button"
                onClick={reject}
                disabled={pending}
                className="bg-s3 border border-line text-cream font-sans text-xs uppercase tracking-[0.14em] py-2 rounded-md hover:border-coral disabled:opacity-40"
              >
                Deny
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={pending}
                className="bg-gold text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] py-2 rounded-md disabled:opacity-40"
              >
                Approve
              </button>
            </>
          ) : guest.status === "approved" ? (
            <button
              type="button"
              onClick={checkIn}
              disabled={pending || guest.flag_dna}
              className="col-span-2 bg-mint text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] py-2 rounded-md disabled:opacity-40"
            >
              Check in
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
