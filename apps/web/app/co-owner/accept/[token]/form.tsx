"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { acceptCoOwnerInviteAction } from "./actions";

export default function CoOwnerAcceptForm({
  token,
  eventName,
  permission,
  alreadyAuthed,
}: {
  token: string;
  eventName: string;
  permission: string;
  alreadyAuthed: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "otp" | "binding">(
    alreadyAuthed ? "binding" : "start"
  );
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function accept() {
    const res = await acceptCoOwnerInviteAction(token);
    if (!res.ok) {
      setError(res.error);
      setStep("start");
      return;
    }
    router.push("/owner");
  }

  function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) return setError("Enter a valid phone.");
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
    if (!e164 || code.length < 4) return setError("Enter the code.");

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
      await accept();
    });
  }

  function onBindExisting() {
    startTransition(async () => {
      await accept();
    });
  }

  if (step === "binding") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          Accept invite to <span className="text-cream">{eventName}</span> with{" "}
          <span className="text-coral">{permission.replace("_", "-")}</span> permission.
        </p>
        {error && <p className="text-coral text-sm">{error}</p>}
        <button
          type="button"
          onClick={onBindExisting}
          className="btn-primary"
          disabled={pending}
        >
          {pending ? "Working…" : "Accept invite"}
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
          {pending ? "Verifying…" : "Verify & accept"}
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
        You&apos;ve been invited to co-own{" "}
        <span className="text-cream">{eventName}</span> with{" "}
        <span className="text-cream">{permission.replace("_", "-")}</span>{" "}
        permission. Verify your phone to continue.
      </p>
      <input
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="input-dark"
        placeholder="(305) 555 1234"
        required
      />
      {error && <p className="text-coral text-sm">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Text me the code"}
      </button>
    </form>
  );
}
