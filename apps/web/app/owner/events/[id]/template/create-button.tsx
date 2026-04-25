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
        onClick={() => setOpen(true)}
        className="btn-ghost text-xs w-auto px-3"
      >
        Create from template
      </button>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-dark"
        placeholder="New event name"
      />
      {err && <p className="text-coral text-xs">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={go}
          disabled={pending}
          className="btn-primary text-xs"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}
