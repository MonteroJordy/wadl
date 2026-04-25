"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";

export default function InviteForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"door_staff" | "door_manager">("door_staff");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    smsProvider: "dev" | "twilio";
    emailSent: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.set("phone", phone);
    if (email.trim()) fd.set("email", email.trim());
    fd.set("role", role);

    startTransition(async () => {
      const res = await createInviteAction(eventId, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({
        url: res.inviteUrl,
        smsProvider: res.smsProvider,
        emailSent: res.emailSent,
      });
      setPhone("");
      setEmail("");
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
      <p className="label-mono">Invite someone</p>

      <div>
        <label htmlFor="staff-phone" className="label-mono block mb-2">
          Phone
        </label>
        <input
          id="staff-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-dark"
          placeholder="(305) 555 1234"
          required
        />
      </div>

      <div>
        <label htmlFor="staff-email" className="label-mono block mb-2">
          Email (optional)
        </label>
        <input
          id="staff-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          placeholder="they@venue.com"
        />
      </div>

      <div>
        <p className="label-mono mb-2">Role</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "door_staff", label: "Door staff", blurb: "Scan + search" },
              { id: "door_manager", label: "Door manager", blurb: "Full guest list" },
            ] as const
          ).map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`border rounded-md px-3 py-3 text-left transition ${
                  active
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                <p className="font-sans text-sm font-semibold">{r.label}</p>
                <p className="label-mono mt-1">{r.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-coral text-sm">{error}</p>}

      {result && (
        <div className="bg-s3 border border-line rounded-md p-3">
          <p className="label-mono mb-2">
            Invite sent
            {result.smsProvider === "dev" && (
              <span className="text-gold"> (SMS DEV — console log)</span>
            )}
            {result.emailSent && (
              <span className="text-mint"> · email also sent</span>
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
