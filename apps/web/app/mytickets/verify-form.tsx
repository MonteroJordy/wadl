"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";

export default function MyTicketsVerify() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSendCode(e: React.FormEvent) {
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
      else setStep("code");
    });
  }

  async function onVerify(e: React.FormEvent) {
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
      router.refresh();
    });
  }

  if (step === "code") {
    return (
      <form onSubmit={onVerify} className="flex flex-col gap-4 mt-6">
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
        {error && <p className="text-err text-sm">{error}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Verifying…" : "See my tickets"}
        </button>
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="label-mono text-center hover:text-cream transition"
        >
          ← Wrong number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSendCode} className="flex flex-col gap-4 mt-6">
      <div>
        <label htmlFor="phone" className="label-mono block mb-2">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-dark"
          placeholder="(305) 555 1234"
          required
        />
      </div>
      {error && <p className="text-err text-sm">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}
