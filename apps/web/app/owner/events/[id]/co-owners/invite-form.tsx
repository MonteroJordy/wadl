"use client";

import { useState, useTransition } from "react";
import { createCoOwnerInviteAction } from "./actions";

export default function CoOwnerInviteForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const permission = "read_only" as const;
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    provider: "dev" | "twilio";
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.set("phone", phone);
    fd.set("email", email);
    fd.set("permission", permission);

    startTransition(async () => {
      const res = await createCoOwnerInviteAction(eventId, fd);
      if (!res.ok) setError(res.error);
      else {
        setResult({
          url: res.inviteUrl,
          provider: res.smsProvider,
          emailSent: res.emailSent,
        });
        setPhone("");
        setEmail("");
      }
    });
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card"
      style={{
        padding: "var(--s-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-4)",
      }}
    >
      <div className="t-h1">Invite a co-owner account</div>

      <div>
        <label htmlFor="co-phone" className="t-meta">
          Phone (optional, for SMS)
        </label>
        <input
          id="co-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
          placeholder="(305) 555 1234"
        />
      </div>

      <div>
        <label htmlFor="co-email" className="t-meta">
          Email (optional, copy link to send)
        </label>
        <input
          id="co-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
          placeholder="they@brand.com"
        />
      </div>

      <div>
        <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
          Permission
        </div>
        <div
          className="card"
          style={{ padding: "var(--s-3)", background: "var(--bg-3)" }}
        >
          <div className="t-body" style={{ fontWeight: 500 }}>
            View-only
          </div>
          <div className="t-body-2" style={{ marginTop: "var(--s-1)" }}>
            Co-owners can see the event, allocations, and guest list. Editable
            tiers are coming — for now everything writeable stays with the
            account owner.
          </div>
        </div>
      </div>

      {error && (
        <p className="t-body-2" style={{ color: "var(--err)" }}>
          {error}
        </p>
      )}

      {result && (
        <div className="card" style={{ padding: "var(--s-3)" }}>
          <div className="t-meta">
            Invite created
            {result.provider === "dev" && (
              <span style={{ color: "var(--warn)" }}>
                {" "}
                (dev — console log)
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: "var(--s-2)",
              marginTop: "var(--s-2)",
            }}
          >
            <input
              value={result.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="input"
              style={{ fontSize: "var(--ts-sm)", fontFamily: "var(--mono)" }}
            />
            <button type="button" className="btn btn--ghost" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <button type="submit" className="btn btn--accent" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
