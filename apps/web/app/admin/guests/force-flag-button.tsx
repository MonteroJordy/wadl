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
    return (
      <span style={{ color: "var(--w-err)", fontSize: 12 }}>⚠ flagged</span>
    );
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
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: "var(--w-err)",
          fontSize: 12,
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? "…" : "force-flag"}
      </button>
      {err && (
        <p
          style={{ color: "var(--w-err)", fontSize: 10, marginTop: 4 }}
        >
          {err}
        </p>
      )}
    </>
  );
}
