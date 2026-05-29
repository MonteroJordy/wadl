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
    <form
      onSubmit={submit}
      className="card"
      style={{
        padding: "var(--s-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
      }}
    >
      <div>
        <div className="t-meta" style={{ marginBottom: "var(--s-1)" }}>
          Endpoint URL
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.yourdomain.com/wadl"
          className="input"
          required
        />
      </div>
      <div>
        <div className="t-meta" style={{ marginBottom: "var(--s-1)" }}>
          Events (comma-separated; * for all)
        </div>
        <input
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          placeholder="rsvp.created,guest.checked_in"
          className="input"
        />
        <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
          Available: <code className="kbd">rsvp.created</code>{" "}
          <code className="kbd">guest.checked_in</code>{" "}
          <code className="kbd">allocation.full</code>{" "}
          <code className="kbd">guest.flagged</code>{" "}
          <code className="kbd">broadcast.sent</code>{" "}
          <code className="kbd">event.created</code>
        </div>
      </div>
      {err && (
        <p className="t-body-2" style={{ color: "var(--err)" }}>
          {err}
        </p>
      )}
      {secret && (
        <p className="t-body-2" style={{ color: "var(--ok)" }}>
          Created. Signing secret:{" "}
          <code className="kbd" style={{ wordBreak: "break-all" }}>
            {secret}
          </code>
          <br />
          Save this — every payload includes{" "}
          <code className="kbd">x-wadl-signature: sha256=&lt;hmac&gt;</code>.
        </p>
      )}
      <button type="submit" className="btn btn--accent" disabled={pending}>
        {pending ? "Creating…" : "Add endpoint"}
      </button>
    </form>
  );
}
