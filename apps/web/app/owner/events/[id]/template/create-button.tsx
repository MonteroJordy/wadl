"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFromTemplateAction } from "./actions";

export default function CreateFromTemplateButton({
  templateId,
  defaultName,
}: {
  templateId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    startTransition(async () => {
      const res = await createFromTemplateAction(templateId, name);
      if (res.ok) router.push(`/owner/events/${res.eventId}/settings`);
      else setErr(res.error);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => setOpen(true)}
      >
        Create from template
      </button>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-2)",
        minWidth: 220,
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        placeholder="New event name"
      />
      {err && (
        <p className="t-meta" style={{ color: "var(--err)" }}>
          {err}
        </p>
      )}
      <div style={{ display: "flex", gap: "var(--s-2)" }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={go}
          disabled={pending}
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}
