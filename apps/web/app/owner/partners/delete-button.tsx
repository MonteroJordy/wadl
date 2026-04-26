"use client";

import { useTransition } from "react";
import { deletePartnerAction } from "./actions";

export default function DeletePartnerButton({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`Remove "${partnerName}" from your partners?`)) return;
        startTransition(async () => {
          await deletePartnerAction(partnerId);
        });
      }}
      disabled={pending}
      className="label-mono text-muted hover:text-coral transition"
      aria-label={`Delete ${partnerName}`}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
