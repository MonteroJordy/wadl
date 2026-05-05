"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWebhookAction } from "./actions";

export default function CreateWebhookForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("*");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await createWebhookAction(url, events);
      if (res.ok) {
        setSecret(res.secret);
        setUrl("");
        router.refresh();
      } else setErr(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3">
      <div>
        <label className="label-mono block mb-2">Endpoint URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.yourdomain.com/wadl"
          className="input-dark"
          required
        />
      </div>
      <div>
        <label className="label-mono block mb-2">
          Events (comma-separated; * for all)
        </label>
        <input
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          placeholder="rsvp.created,guest.checked_in"
          className="input-dark"
        />
        <p className="label-mono mt-2">
          Available: <code>rsvp.created</code>, <code>guest.checked_in</code>,{" "}
          <code>allocation.full</code>, <code>guest.flagged</code>,{" "}
          <code>broadcast.sent</code>, <code>event.created</code>
        </p>
      </div>
      {err && <p className="text-err text-sm">{err}</p>}
      {secret && (
        <p className="text-mint text-sm">
          Created. Signing secret:{" "}
          <code className="text-cream break-all">{secret}</code>
          <br />
          Save this — every payload includes <code>x-wadl-signature: sha256=&lt;hmac&gt;</code>.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Add endpoint"}
      </button>
    </form>
  );
}
