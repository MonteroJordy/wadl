"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { platformForceFlagAction } from "./actions";

export default function ForceFlagButton({
  guestId,
  alreadyFlagged,
}: {
  guestId: string;
  alreadyFlagged: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (alreadyFlagged) {
    return <span className="chip chip--err">Flagged</span>;
  }

  function go() {
    const reason = prompt("Reason for the platform-level DNA flag?");
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      const res = await platformForceFlagAction(guestId, reason);
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="btn btn--danger btn--sm"
        style={{ opacity: pending ? 0.5 : 1 }}
      >
        {pending ? "…" : "Force-flag"}
      </button>
      {err && (
        <p
          className="t-meta"
          style={{ color: "var(--err)", marginTop: "var(--s-1)" }}
        >
          {err}
        </p>
      )}
    </>
  );
}
