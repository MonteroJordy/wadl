"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { completeRsvpAction } from "./actions";
import { fmtDate, fmtTime } from "@/lib/format";

interface Props {
  eventId: string;
  eventName: string;
  night: { id: string; night_date: string; doors_at: string };
}

type Step = "form" | "otp" | "success";

export default function RsvpForm({ eventId, eventName, night }: Props) {
  const [step, setStep] = useState<Step>("form");

  const [fullName, setFullName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [e164Phone, setE164Phone] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [plusOnes, setPlusOnes] = useState(0);
  const [code, setCode] = useState("");
  const [smsConsent, setSmsConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<
    | {
        ticketUrl: string;
        status: "approved" | "pending";
        smsProvider: "dev" | "twilio";
      }
    | null
  >(null);
  const [pending, startTransition] = useTransition();

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Enter your name.");
    const normalized = normalizePhone(phoneInput);
    if (!normalized) return setError("Enter a valid phone number.");
    if (!smsConsent)
      return setError("SMS consent is required to receive your QR ticket.");

    setE164Phone(normalized);
    const supabase = createClient();
    startTransition(async () => {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (otpErr) setError(otpErr.message);
      else setStep("otp");
    });
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!e164Phone) return setError("Missing phone. Start over.");
    if (code.length < 4) return setError("Enter the code.");

    const supabase = createClient();
    startTransition(async () => {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: code,
        type: "sms",
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }

      const result = await completeRsvpAction({
        eventId,
        nightId: night.id,
        fullName: fullName.trim(),
        phone: e164Phone,
        plusOnes,
        email: email.trim() || null,
        smsConsent,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess({
        ticketUrl: result.ticketUrl,
        status: result.status,
        smsProvider: result.smsProvider,
      });
      setStep("success");
    });
  }

  if (step === "success" && success) {
    return (
      <main className="mobile-frame">
        <div className="pt-8">
          <p className="label-mono mb-2">You&apos;re on</p>
          <h1 className="display-lg mb-3">
            {success.status === "approved" ? "Locked in." : "Sent for review."}
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            {success.status === "approved"
              ? "Your name is on the list. We texted your QR — show it at the door."
              : "The host needs to approve your request. You&apos;ll still get the QR now; it&apos;ll activate once you&apos;re approved."}
          </p>
        </div>

        <div className="card mt-6">
          <p className="label-mono mb-2">{eventName}</p>
          <p className="font-sans text-cream">
            {fmtDate(night.night_date)} · Doors {fmtTime(night.doors_at)}
          </p>
        </div>

        {success.smsProvider === "dev" && (
          <div className="card mt-4 border-gold/40">
            <p className="label-mono text-gold mb-1">DEV MODE</p>
            <p className="text-muted text-xs">
              SMS logged to server console, not sent. Open the link below or
              check /mytickets.
            </p>
          </div>
        )}

        <Link
          href={success.ticketUrl.replace(
            typeof window !== "undefined" ? window.location.origin : "",
            ""
          )}
          className="btn-primary text-center mt-6 block"
        >
          See your QR
        </Link>
        <Link href="/mytickets" className="btn-ghost text-center mt-3 block">
          My tickets
        </Link>
      </main>
    );
  }

  if (step === "otp") {
    return (
      <main className="mobile-frame">
        <header className="flex items-center justify-between pt-6 pb-4">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="label-mono hover:text-cream"
          >
            ← Back
          </button>
          <p className="label-mono">Verify</p>
        </header>

        <h1 className="display-lg mb-3">Enter code.</h1>
        <p className="text-muted text-sm">
          Sent to <span className="text-cream">{e164Phone}</span>.
        </p>

        <form onSubmit={onVerify} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="code" className="label-mono block mb-2">
              6-digit code
            </label>
            <input
              id="code"
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
          </div>

          {error && <p className="text-coral text-sm">{error}</p>}

          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Locking you in…" : "Verify & RSVP"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={`/e/${eventId}`} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono">RSVP</p>
      </header>

      <h1 className="display-lg mb-2">Get on.</h1>
      <p className="label-mono mb-6">
        {eventName} · {fmtDate(night.night_date)} · Doors{" "}
        {fmtTime(night.doors_at)}
      </p>

      <form onSubmit={onSendCode} className="flex flex-col gap-5">
        <div>
          <label htmlFor="fullName" className="label-mono block mb-2">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-dark"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="label-mono block mb-2">
            Phone (for your ticket)
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="input-dark"
            placeholder="(305) 555 1234"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label-mono block mb-2">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-dark"
          />
        </div>

        <div>
          <label htmlFor="plusOnes" className="label-mono block mb-2">
            +1s
          </label>
          <select
            id="plusOnes"
            value={plusOnes}
            onChange={(e) => setPlusOnes(parseInt(e.target.value, 10))}
            className="input-dark"
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Just me" : `+${n}`}
              </option>
            ))}
          </select>
          <p className="label-mono mt-2">
            +1s are approved by the host. Subject to availability.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(e) => setSmsConsent(e.target.checked)}
            className="mt-1 accent-coral w-4 h-4"
          />
          <span className="text-xs text-cream/80 leading-relaxed">
            I consent to receive SMS messages from WADL about my ticket and
            event updates. Reply STOP any time to opt out. Standard message
            rates apply. See our{" "}
            <Link href="/privacy" className="text-coral underline">
              privacy policy
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Sending…" : "Text me the code"}
        </button>
      </form>
    </main>
  );
}
