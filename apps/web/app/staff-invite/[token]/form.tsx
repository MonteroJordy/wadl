"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { Button } from "@/components/wadl";
import { acceptInviteAction } from "./actions";

interface Props {
  token: string;
  invitePhone: string;
  eventName: string;
  role: "door_staff" | "door_manager" | "photographer";
  alreadyAuthedPhone: string | null;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          You&apos;re already signed in as{" "}
          <span style={{ color: "var(--w-fg)" }}>{e164}</span>. Bind this
          invite to your account.
        </p>
        {error && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
          >
            {error}
          </p>
        )}
        <Button
          variant="primary"
          type="button"
          onClick={onBindExisting}
          disabled={pending}
        >
          {pending ? "Working…" : `Accept invite as ${roleLabel}`}
        </Button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form
        onSubmit={onVerify}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          Sent to <span style={{ color: "var(--w-fg)" }}>{e164}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{
            ...INPUT_STYLE,
            letterSpacing: "0.5em",
            textAlign: "center",
            fontSize: 24,
          }}
          placeholder="••••••"
          required
        />
        {error && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
          >
            {error}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Verifying…" : `Verify & join as ${roleLabel}`}
        </Button>
        <button
          type="button"
          onClick={() => setStep("start")}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--w-fg-muted)",
            textAlign: "center",
            padding: 0,
          }}
        >
          ← WRONG NUMBER
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSendCode}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <p
        className="w-type-body-sm"
        style={{ color: "var(--w-fg-muted)", lineHeight: 1.5 }}
      >
        You were invited to work the door at{" "}
        <span style={{ color: "var(--w-fg)" }}>{eventName}</span> as{" "}
        <span style={{ color: "var(--w-fg)" }}>{roleLabel.toLowerCase()}</span>
        . Verify your phone to continue.
      </p>
      <div>
        <label
          htmlFor="invite-phone"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          PHONE
        </label>
        <input
          id="invite-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={INPUT_STYLE}
          required
        />
      </div>
      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Text me the code"}
      </Button>
    </form>
  );
}
