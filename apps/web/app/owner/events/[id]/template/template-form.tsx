"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTemplateAction } from "./actions";

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
      <div className="card border-mint/40">
        <p className="label-mono text-mint mb-1">Saved</p>
        <p className="text-cream text-sm">Template added below.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label-mono block mb-2">Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday at the Patio"
          className="input-dark"
        />
      </div>
      <div>
        <label className="label-mono block mb-2">
          Auto-create cadence (days; blank = manual only)
        </label>
        <input
          value={cadence}
          onChange={(e) => setCadence(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="7"
          className="input-dark"
        />
      </div>
      {err && <p className="text-err text-sm">{err}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}
