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
      <div className="card" style={{ padding: "var(--s-5)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div className="t-h1">Template saved</div>
          <span className="chip chip--ok">Saved</span>
        </div>
        <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          Template added to the list below.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ padding: "var(--s-5)" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <div className="t-meta">Template name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday at the Patio"
            className="input"
            style={{ marginTop: "var(--s-2)" }}
          />
        </div>
        <div>
          <div className="t-meta">Auto-create cadence (days)</div>
          <input
            value={cadence}
            onChange={(e) => setCadence(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="7 — blank = manual only"
            className="input"
            style={{ marginTop: "var(--s-2)" }}
          />
        </div>
      </div>
      {err && (
        <p
          className="t-body-2"
          style={{ color: "var(--err)", marginTop: "var(--s-3)" }}
        >
          {err}
        </p>
      )}
      <button
        type="submit"
        className="btn"
        disabled={pending}
        style={{ marginTop: "var(--s-4)" }}
      >
        {pending ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}
