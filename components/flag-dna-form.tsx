"use client";

import { useState, useTransition } from "react";
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
    if (!confirm("Remove the DO NOT ADMIT flag on this guest?")) return;
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const res = await toggleFlagDnaAction(guestId, false, "");
      if (!res.ok) setError(res.error);
      else {
        setFlagged(false);
        setSaved("Flag removed.");
      }
    });
  }

  if (flagged) {
    return (
      <div className="card border-coral">
        <p className="label-mono text-coral mb-1">⚠ FLAGGED — DO NOT ADMIT</p>
        {initialReason && (
          <p className="text-cream text-sm mb-3">{initialReason}</p>
        )}
        <button
          type="button"
          onClick={onUnflag}
          disabled={pending}
          className="btn-ghost"
        >
          {pending ? "Working…" : "Remove flag"}
        </button>
        {error && <p className="text-coral text-sm mt-2">{error}</p>}
        {saved && <p className="text-mint text-sm mt-2">{saved}</p>}
      </div>
    );
  }

  if (!showConfirm) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="btn-ghost border-coral/60 text-coral"
        >
          ⚠ Flag Do Not Admit
        </button>
        {saved && <p className="text-mint text-sm mt-2">{saved}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onFlag} className="card border-coral/60 flex flex-col gap-3">
      <p className="label-mono text-coral">Flag this guest</p>
      <p className="text-muted text-sm">
        Any scan of their QR will show <span className="text-cream">DO NOT ADMIT</span> at the door.
        This is logged to the audit trail.
      </p>
      <div>
        <label htmlFor="flag-reason" className="label-mono block mb-2">
          Reason
        </label>
        <textarea
          id="flag-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input-dark min-h-[72px]"
          placeholder="Fight at last event. Banned."
          required
          autoFocus
        />
      </div>
      {error && <p className="text-coral text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !reason.trim()}
          className="w-full bg-coral text-bg font-sans font-semibold text-sm uppercase tracking-[0.14em] py-4 rounded-md disabled:opacity-40 hover:brightness-110 transition"
        >
          {pending ? "Flagging…" : "Flag DNA"}
        </button>
      </div>
    </form>
  );
}
