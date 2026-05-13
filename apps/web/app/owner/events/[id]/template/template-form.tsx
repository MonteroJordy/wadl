"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/wadl";
import { saveTemplateAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

export default function TemplateForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const cadenceDays = cadence === "" ? null : parseInt(cadence, 10);
      const res = await saveTemplateAction(eventId, {
        name,
        cadence_days: cadenceDays,
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.refresh(), 600);
      } else setErr(res.error);
    });
  }

  if (done) {
    return (
      <div
        className="w-card"
        style={{ padding: 16, borderColor: "var(--w-ok)" }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-ok)", marginBottom: 4 }}
        >
          SAVED
        </div>
        <p style={{ color: "var(--w-fg)", fontSize: 14 }}>
          Template added below.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <div className="w-type-meta" style={{ marginBottom: 6 }}>
          TEMPLATE NAME
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday at the Patio"
          style={INPUT_STYLE}
        />
      </div>
      <div>
        <div className="w-type-meta" style={{ marginBottom: 6 }}>
          AUTO-CREATE CADENCE (DAYS; BLANK = MANUAL ONLY)
        </div>
        <input
          value={cadence}
          onChange={(e) => setCadence(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="7"
          style={INPUT_STYLE}
        />
      </div>
      {err && (
        <p className="w-type-body-sm" style={{ color: "var(--w-err)" }}>
          {err}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save template"}
      </Button>
    </form>
  );
}
