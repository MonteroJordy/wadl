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
  role: "door_staff" | "door_manager";
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
    alreadyAuthedPhone ? "binding" : "start"
  );
  const [phone, setPhone] = useState(invitePhone);
  const [code, setCode] = useState("");
  const [e164, setE164] = useState<string | null>(
    alreadyAuthedPhone
      ? alreadyAuthedPhone.startsWith("+")
        ? alreadyAuthedPhone
        : `+${alreadyAuthedPhone}`
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function accept(phoneE164: string) {
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

  const roleLabel = role === "door_manager" ? "Door manager" : "Door staff";

  if (step === "binding") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          You&apos;re already signed in as <span className="text-cream">{e164}</span>.
          Bind this invite to your account.
        </p>
        {error && <p className="text-coral text-sm">{error}</p>}
        <button
          type="button"
          onClick={onBindExisting}
          className="btn-primary"
          disabled={pending}
        >
          {pending ? "Working…" : `Accept invite as ${roleLabel}`}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={onVerify} className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          Sent to <span className="text-cream">{e164}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="input-dark tracking-[0.5em] text-center text-2xl"
          placeholder="••••••"
          required
        />
        {error && <p className="text-coral text-sm">{error}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Verifying…" : `Verify & join as ${roleLabel}`}
        </button>
        <button
          type="button"
          onClick={() => setStep("start")}
          className="label-mono text-center hover:text-cream transition"
        >
          ← Wrong number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSendCode} className="flex flex-col gap-4">
      <p className="text-muted text-sm">
        You were invited to work the door at{" "}
        <span className="text-cream">{eventName}</span> as{" "}
        <span className="text-cream">{roleLabel.toLowerCase()}</span>. Verify
        your phone to continue.
      </p>
      <div>
        <label htmlFor="invite-phone" className="label-mono block mb-2">
          Phone
        </label>
        <input
          id="invite-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-dark"
          required
        />
      </div>
      {error && <p className="text-coral text-sm">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Text me the code"}
      </button>
    </form>
  );
}
