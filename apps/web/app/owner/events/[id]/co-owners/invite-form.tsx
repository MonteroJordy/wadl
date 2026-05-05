"use client";

import { useState, useTransition } from "react";
import { createCoOwnerInviteAction } from "./actions";

export default function CoOwnerInviteForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Only "read_only" is enforceable today (Day 19 audit P1-1).
  // The DB column accepts edit/admin for future tiering — UI doesn't offer
  // them until write enforcement is wired.
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
    <form onSubmit={onSubmit} className="card flex flex-col gap-4">
      <p className="label-mono">Invite a co-owner account</p>

      <div>
        <label htmlFor="co-phone" className="label-mono block mb-2">
          Phone (optional, for SMS)
        </label>
        <input
          id="co-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-dark"
          placeholder="(305) 555 1234"
        />
      </div>

      <div>
        <label htmlFor="co-email" className="label-mono block mb-2">
          Email (optional, copy link to send)
        </label>
        <input
          id="co-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          placeholder="they@brand.com"
        />
      </div>

      <div>
        <p className="label-mono mb-2">Permission</p>
        <div className="card border-line">
          <p className="label-mono text-cream mb-1">View-only</p>
          <p className="text-muted text-xs leading-relaxed">
            Co-owners can see the event, allocations, and guest list. Editable
            tiers are coming — for now everything writeable stays with the
            account owner.
          </p>
        </div>
      </div>

      {error && <p className="text-err text-sm">{error}</p>}

      {result && (
        <div className="bg-s3 border border-line rounded-md p-3">
          <p className="label-mono mb-2">
            Invite created
            {result.provider === "dev" && (
              <span className="text-gold"> (DEV — console log)</span>
            )}
          </p>
          <div className="flex gap-2">
            <input
              value={result.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="input-dark text-xs font-mono"
            />
            <button
              type="button"
              onClick={copy}
              className="btn-ghost w-auto px-4"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
