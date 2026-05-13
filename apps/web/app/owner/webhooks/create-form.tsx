"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/wadl";
import { createWebhookAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

const CODE: React.CSSProperties = {
  fontFamily: "var(--w-mono)",
  background: "var(--w-surface-2)",
  border: "1px solid var(--w-line)",
  padding: "1px 6px",
  fontSize: 11,
};

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
      className="w-card"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div className="w-type-meta" style={{ marginBottom: 6 }}>
          ENDPOINT URL
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.yourdomain.com/wadl"
          style={INPUT_STYLE}
          required
        />
      </div>
      <div>
        <div className="w-type-meta" style={{ marginBottom: 6 }}>
          EVENTS (COMMA-SEPARATED; * FOR ALL)
        </div>
        <input
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          placeholder="rsvp.created,guest.checked_in"
          style={INPUT_STYLE}
        />
        <div className="w-type-meta" style={{ marginTop: 8 }}>
          AVAILABLE: <code style={CODE}>rsvp.created</code>,{" "}
          <code style={CODE}>guest.checked_in</code>,{" "}
          <code style={CODE}>allocation.full</code>,{" "}
          <code style={CODE}>guest.flagged</code>,{" "}
          <code style={CODE}>broadcast.sent</code>,{" "}
          <code style={CODE}>event.created</code>
        </div>
      </div>
      {err && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {err}
        </p>
      )}
      {secret && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-ok)" }}
        >
          Created. Signing secret:{" "}
          <code style={{ ...CODE, wordBreak: "break-all" }}>{secret}</code>
          <br />
          Save this — every payload includes{" "}
          <code style={CODE}>x-wadl-signature: sha256=&lt;hmac&gt;</code>.
        </p>
      )}
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Add endpoint"}
      </Button>
    </form>
  );
}
