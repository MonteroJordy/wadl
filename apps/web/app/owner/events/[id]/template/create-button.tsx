"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/wadl";
import { createFromTemplateAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen(true)}
        style={{ fontSize: 12 }}
      >
        Create from template
      </Button>
    );
  }
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={INPUT_STYLE}
        placeholder="New event name"
      />
      {err && (
        <p
          style={{ color: "var(--w-err)", fontSize: 12 }}
        >
          {err}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <Button
          variant="ghost"
          type="button"
          onClick={() => setOpen(false)}
          style={{ fontSize: 12 }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={go}
          disabled={pending}
          style={{ fontSize: 12 }}
        >
          {pending ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
