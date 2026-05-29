"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { acceptInviteAction } from "./actions";

interface Props {
  token: string;
  invitePhone: string;
  eventName: string;
  role: "door_staff" | "door_manager" | "photographer";
  alreadyAuthedPhone: string | null;
}

export default function InviteAcceptForm({
  token,
  invitePhone,
  eventName,
  role,
  alreadyAuthedPhone,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "otp" | "binding">(
    alreadyAuthedPhone ? "binding" : "start",
  );
  const [phone, setPhone] = useState(invitePhone);
  const [code, setCode] = useState("");
  const [e164, setE164] = useState<string | null>(
    alreadyAuthedPhone
      ? alreadyAuthedPhone.startsWith("+")
        ? alreadyAuthedPhone
        : `+${alreadyAuthedPhone}`
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function accept(_phoneE164: string) {
    const res = await acceptInviteAction(token);
    if (!res.ok) {
      setError(res.error);
      setStep("start");
      return;
    }
    router.push(res.redirectTo);
  }

  function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) return setError("Enter a valid phone number.");
    setE164(normalized);

    const supabase = createClient();
    startTransition(async () => {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (err) setError(err.message);
      else setStep("otp");
    });
  }

  function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!e164) return setError("Start over.");
    if (code.length < 4) return setError("Enter the code.");

    const supabase = createClient();
    startTransition(async () => {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code,
        type: "sms",
      });
      if (err) {
        setError(err.message);
        return;
      }
      setStep("binding");
      await accept(e164);
    });
  }

  function onBindExisting() {
    if (!e164) return;
    startTransition(async () => {
      await accept(e164);
    });
  }

  const roleLabel =
    role === "door_manager"
      ? "Door manager"
      : role === "photographer"
        ? "Photographer"
        : "Door staff";

  if (step === "binding") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        <p className="t-body-2">
          You&apos;re already signed in as{" "}
          <span style={{ color: "var(--fg)" }}>{e164}</span>. Bind this invite
          to your account.
        </p>
        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}
        <button
          className="btn btn--accent"
          type="button"
          onClick={onBindExisting}
          disabled={pending}
        >
          {pending ? "Working…" : `Accept invite as ${roleLabel}`}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form
        onSubmit={onVerify}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        <p className="t-body-2">
          Sent to <span style={{ color: "var(--fg)" }}>{e164}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="input"
          style={{
            letterSpacing: "0.5em",
            textAlign: "center",
            fontSize: 24,
            height: 56,
          }}
          placeholder="••••••"
          required
        />
        {error && (
          <p className="t-body-2" style={{ color: "var(--err)" }}>
            {error}
          </p>
        )}
        <button className="btn btn--accent" type="submit" disabled={pending}>
          {pending ? "Verifying…" : `Verify & join as ${roleLabel}`}
        </button>
        <button
          type="button"
          onClick={() => setStep("start")}
          className="t-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--fg-3)",
            textAlign: "center",
            padding: 0,
          }}
        >
          ← Wrong number
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSendCode}
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}
    >
      <p className="t-body-2">
        You were invited to work the door at{" "}
        <span style={{ color: "var(--fg)" }}>{eventName}</span> as{" "}
        <span style={{ color: "var(--fg)" }}>{roleLabel.toLowerCase()}</span>.
        Verify your phone to continue.
      </p>
      <div>
        <label
          htmlFor="invite-phone"
          className="t-meta"
          style={{ display: "block", marginBottom: "var(--s-2)" }}
        >
          Phone
        </label>
        <input
          id="invite-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          required
        />
      </div>
      {error && (
        <p className="t-body-2" style={{ color: "var(--err)" }}>
          {error}
        </p>
      )}
      <button className="btn btn--accent" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Text me the code"}
      </button>
    </form>
  );
}
