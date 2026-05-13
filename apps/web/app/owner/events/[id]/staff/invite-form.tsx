"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import { createInviteAction } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

export default function InviteForm({ eventId }: { eventId: string }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "door_staff" | "door_manager" | "photographer"
  >("door_staff");
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
      <div className="w-type-meta">INVITE SOMEONE</div>

      <div>
        <label
          htmlFor="staff-phone"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          PHONE
        </label>
        <input
          id="staff-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={INPUT_STYLE}
          placeholder="(305) 555 1234"
          required
        />
      </div>

      <div>
        <label
          htmlFor="staff-email"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          EMAIL (OPTIONAL)
        </label>
        <input
          id="staff-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={INPUT_STYLE}
          placeholder="they@venue.com"
        />
      </div>

      <div>
        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          ROLE
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          {(
            [
              {
                id: "door_staff",
                label: "Door staff",
                blurb: "Scan + search",
              },
              {
                id: "door_manager",
                label: "Door manager",
                blurb: "Full guest list",
              },
              {
                id: "photographer",
                label: "Photographer",
                blurb: "Upload event photos",
              },
            ] as const
          ).map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                style={{
                  border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
                  background: active
                    ? "var(--w-acc-soft)"
                    : "var(--w-surface-1)",
                  color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                  padding: "12px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</p>
                <div className="w-type-meta" style={{ marginTop: 4 }}>
                  {r.blurb.toUpperCase()}
                </div>
              </button>
            );
          })}
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
            INVITE SENT
            {result.smsProvider === "dev" && (
              <span style={{ color: "var(--w-warn)" }}>
                {" "}
                (SMS DEV — CONSOLE LOG)
              </span>
            )}
            {result.emailSent && (
              <span style={{ color: "var(--w-ok)" }}>
                {" "}
                · EMAIL ALSO SENT
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
