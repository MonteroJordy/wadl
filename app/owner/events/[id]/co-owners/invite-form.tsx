"use client";

import { useState, useTransition } from "react";
import { createCoOwnerInviteAction } from "./actions";

export default function CoOwnerInviteForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read_only" | "edit" | "admin">(
    "edit"
  );
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
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "read_only", label: "Read-only" },
              { id: "edit", label: "Edit" },
              { id: "admin", label: "Admin" },
            ] as const
          ).map((p) => {
            const active = permission === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPermission(p.id)}
                className={`border rounded-md px-2 py-2 font-mono text-xs uppercase tracking-wider transition ${
                  active
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-coral text-sm">{error}</p>}

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
