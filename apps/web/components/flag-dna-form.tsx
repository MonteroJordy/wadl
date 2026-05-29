"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
import { toggleFlagDnaAction } from "@/lib/flag";

interface Props {
  guestId: string;
  initialFlagged: boolean;
  initialReason: string;
}

export default function FlagDnaForm({
  guestId,
  initialFlagged,
  initialReason,
}: Props) {
  const [flagged, setFlagged] = useState(initialFlagged);
  const [reason, setReason] = useState(initialReason);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [unflagOpen, setUnflagOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onFlag(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    if (!reason.trim()) {
      setError("Reason required to flag.");
      return;
    }

    startTransition(async () => {
      const res = await toggleFlagDnaAction(guestId, true, reason);
      if (!res.ok) setError(res.error);
      else {
        setFlagged(true);
        setShowConfirm(false);
        setSaved("Flagged. Door will reject on scan.");
      }
    });
  }

  function onUnflag() {
    setUnflagOpen(true);
  }

  function doUnflag() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await toggleFlagDnaAction(guestId, false, "");
      if (!res.ok) setError(res.error);
      else {
        setFlagged(false);
        setSaved("Flag removed.");
      }
      setUnflagOpen(false);
    });
  }

  if (flagged) {
    return (
      <div
        className="w-card"
        style={{ padding: 14, borderColor: "var(--w-err)" }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)", marginBottom: 4 }}
        >
          ⚠ FLAGGED — DO NOT ADMIT
        </div>
        {initialReason && (
          <p
            style={{
              color: "var(--w-fg)",
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            {initialReason}
          </p>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onUnflag}
          disabled={pending}
        >
          {pending ? "Working…" : "Remove flag"}
        </button>
        {error && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)", marginTop: 8 }}
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)", marginTop: 8 }}
          >
            {saved}
          </p>
        )}
        <ConfirmDialog
          open={unflagOpen}
          title="Remove the DO NOT ADMIT flag?"
          body="The guest will be able to scan in normally again at the door. The original flag entry stays in the audit log."
          confirmLabel="Remove flag"
          pending={pending}
          onConfirm={doUnflag}
          onCancel={() => setUnflagOpen(false)}
        />
      </div>
    );
  }

  if (!showConfirm) {
    return (
      <div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowConfirm(true)}
          style={{
            borderColor: "var(--w-err)",
            color: "var(--w-err)",
          }}
        >
          ⚠ Flag Do Not Admit
        </button>
        {saved && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-ok)", marginTop: 8 }}
          >
            {saved}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onFlag}
      className="w-card"
      style={{
        padding: 14,
        borderColor: "var(--w-err)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        className="w-type-meta"
        style={{ color: "var(--w-err)" }}
      >
        FLAG THIS GUEST
      </div>
      <p
        className="w-type-body-sm"
        style={{ color: "var(--w-fg-muted)", lineHeight: 1.5 }}
      >
        Any scan of their QR will show{" "}
        <span style={{ color: "var(--w-fg)" }}>DO NOT ADMIT</span> at the door.
        This is logged to the audit trail.
      </p>
      <div>
        <label
          htmlFor="flag-reason"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          REASON
        </label>
        <textarea
          id="flag-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: "100%",
            background: "var(--w-surface-1)",
            border: "1px solid var(--w-line)",
            color: "var(--w-fg)",
            padding: "10px 12px",
            fontFamily: "var(--w-sans)",
            fontSize: 14,
            minHeight: 72,
          }}
          placeholder="Fight at last event. Banned."
          required
          autoFocus
        />
      </div>
      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setShowConfirm(false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn"
          disabled={pending || !reason.trim()}
          style={{
            background: "var(--w-err)",
            borderColor: "var(--w-err)",
            color: "var(--w-bg)",
          }}
        >
          {pending ? "Flagging…" : "Flag DNA"}
        </button>
      </div>
    </form>
  );
}
