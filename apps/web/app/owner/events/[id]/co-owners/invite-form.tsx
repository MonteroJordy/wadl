"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import { createCoOwnerInviteAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
      className="w-card"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div className="w-type-meta">INVITE A CO-OWNER ACCOUNT</div>

      <div>
        <label
          htmlFor="co-phone"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          PHONE (OPTIONAL, FOR SMS)
        </label>
        <input
          id="co-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={INPUT_STYLE}
          placeholder="(305) 555 1234"
        />
      </div>

      <div>
        <label
          htmlFor="co-email"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          EMAIL (OPTIONAL, COPY LINK TO SEND)
        </label>
        <input
          id="co-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={INPUT_STYLE}
          placeholder="they@brand.com"
        />
      </div>

      <div>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          PERMISSION
        </div>
        <div className="w-card" style={{ padding: 12 }}>
          <div className="w-type-meta" style={{ marginBottom: 4 }}>
            VIEW-ONLY
          </div>
          <p
            style={{
              color: "var(--w-fg-muted)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Co-owners can see the event, allocations, and guest list. Editable
            tiers are coming — for now everything writeable stays with the
            account owner.
          </p>
        </div>
      </div>

      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </p>
      )}

      {result && (
        <div
          style={{
            background: "var(--w-surface-2)",
            border: "1px solid var(--w-line)",
            padding: 12,
          }}
        >
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            INVITE CREATED
            {result.provider === "dev" && (
              <span style={{ color: "var(--w-warn)" }}>
                {" "}
                (DEV — CONSOLE LOG)
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={result.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              style={{
                ...INPUT_STYLE,
                fontSize: 12,
                fontFamily: "var(--w-mono)",
              }}
            />
            <Button
              variant="ghost"
              type="button"
              onClick={copy}
              style={{ padding: "0 18px" }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
