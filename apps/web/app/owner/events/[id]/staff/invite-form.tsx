"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";

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
      className="card"
      style={{ padding: "var(--s-5)" }}
    >
      <div className="t-h1" style={{ marginBottom: "var(--s-4)" }}>
        Invite someone
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <label htmlFor="staff-phone" className="t-meta">
            Phone
          </label>
          <input
            id="staff-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            style={{ marginTop: "var(--s-2)" }}
            placeholder="(305) 555 1234"
            required
          />
        </div>
        <div>
          <label htmlFor="staff-email" className="t-meta">
            Email (optional)
          </label>
          <input
            id="staff-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            style={{ marginTop: "var(--s-2)" }}
            placeholder="they@venue.com"
          />
        </div>
      </div>

      <div style={{ marginTop: "var(--s-5)" }}>
        <div className="t-meta">Role</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--s-2)",
            marginTop: "var(--s-2)",
          }}
        >
          {(
            [
              { id: "door_staff", label: "Door staff", blurb: "Scan + search" },
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
                  border: `1px solid ${
                    active ? "var(--fg)" : "var(--line-2)"
                  }`,
                  borderRadius: "var(--r-md)",
                  background: active ? "var(--bg-3)" : "transparent",
                  padding: "var(--s-3)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  className="t-body"
                  style={{
                    fontWeight: 500,
                    color: active ? "var(--fg)" : "var(--fg-3)",
                  }}
                >
                  {r.label}
                </div>
                <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                  {r.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p
          className="t-body-2"
          style={{ color: "var(--err)", marginTop: "var(--s-3)" }}
        >
          {error}
        </p>
      )}

      {result && (
        <div
          className="card"
          style={{ padding: "var(--s-4)", marginTop: "var(--s-4)" }}
        >
          <div className="t-meta">
            Invite sent
            {result.smsProvider === "dev" && (
              <span style={{ color: "var(--warn)" }}>
                {" "}
                · SMS dev (console log)
              </span>
            )}
            {result.emailSent && (
              <span style={{ color: "var(--ok)" }}> · email also sent</span>
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
              style={{ fontSize: "var(--ts-sm)" }}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={copy}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn--accent"
        disabled={pending}
        style={{ marginTop: "var(--s-4)" }}
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
