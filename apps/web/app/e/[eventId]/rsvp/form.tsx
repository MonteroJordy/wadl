"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { completeRsvpAction } from "./actions";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  Avatar,
  Button,
  Chip,
  CredentialCard,
  WFrame,
  Wordmark,
} from "@/components/wadl";

interface Props {
  eventId: string;
  eventName: string;
  night: { id: string; night_date: string; doors_at: string };
  // Day 50 wedge — when entry is via /d/[subToken] the page populates
  // these so the action can attach to the right holder allocation at
  // the right tier instead of falling into the Walk-up bucket.
  tier?: "ga" | "vip" | "aaa" | null;
  allocationId?: string | null;
  subToken?: string | null;
}

type Step = "form" | "otp" | "success";

export default function RsvpForm({
  eventId,
  eventName,
  night,
  tier,
  allocationId,
  subToken,
}: Props) {
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
      return setError(
        "SMS consent is required to receive your QR ticket.",
      );

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
        tier: tier ?? null,
        allocationId: allocationId ?? null,
        subToken: subToken ?? null,
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

  // Progress strip — 3 steps, accent fills as you advance
  const stepIdx = step === "form" ? 0 : step === "otp" ? 1 : 2;

  // ─────────── SUCCESS ───────────
  if (step === "success" && success) {
    return (
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <ProgressStrip step={2} />
          <div
            style={{
              padding: "24px 20px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Wordmark variant="monogrid" size={18} />
            <Chip tone="acc">YOU&apos;RE IN</Chip>
          </div>
          <div style={{ padding: "32px 20px 0" }}>
            <div className="w-type-meta">CREDENTIAL · GA</div>
            <div className="w-type-h1" style={{ marginTop: 6 }}>
              {success.status === "approved"
                ? "Show this at the door."
                : "Sent for review."}
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              {success.status === "approved"
                ? "You're locked in. We texted your QR — show it at the door."
                : "The host needs to approve this. We sent your QR anyway; it activates once approved."}
            </p>
          </div>

          <div style={{ padding: "20px 20px 0" }}>
            <CredentialCard
              variant="mono"
              tier="GA"
              name={fullName.trim() || "Guest"}
              event={eventName}
              date={fmtDate(night.night_date)
                .toUpperCase()
                .replace(/[\.,]/g, "")}
            />
          </div>

          {success.smsProvider === "dev" && (
            <div style={{ padding: "16px 20px 0" }}>
              <div
                className="w-card"
                style={{
                  padding: 14,
                  borderColor: "var(--w-warn)",
                }}
              >
                <Chip tone="warn">DEV MODE</Chip>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg-muted)",
                    marginTop: 8,
                  }}
                >
                  SMS logged to server console, not sent. Tap See your QR or
                  check /mytickets.
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              padding: "20px 20px 0",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Link
              href={success.ticketUrl.replace(
                typeof window !== "undefined" ? window.location.origin : "",
                "",
              )}
              style={{ textDecoration: "none" }}
            >
              <Button variant="primary" size="lg" block>
                See your QR
              </Button>
            </Link>
            <Link href="/mytickets" style={{ textDecoration: "none" }}>
              <Button variant="ghost" size="lg" block>
                My tickets
              </Button>
            </Link>
          </div>
        </WFrame>
      </main>
    );
  }

  // ─────────── OTP ───────────
  if (step === "otp") {
    return (
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <ProgressStrip step={1} />
          <div
            style={{
              padding: "24px 20px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-type-meta"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--w-fg-muted)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← BACK
            </button>
            <Wordmark variant="monogrid" size={18} />
            <span className="w-type-meta">VERIFY</span>
          </div>

          <div style={{ padding: "32px 20px 0" }}>
            <div className="w-type-meta">VERIFY</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6, lineHeight: 1.0 }}
            >
              Enter code.
            </div>
            <p
              className="w-type-body"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
              }}
            >
              Sent to{" "}
              <span style={{ color: "var(--w-fg)" }}>{e164Phone}</span>.
            </p>
          </div>

          <form
            onSubmit={onVerify}
            style={{
              padding: "32px 20px 0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="code" className="w-label">
                6-DIGIT CODE
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-input"
                style={{
                  height: 64,
                  fontSize: 28,
                  textAlign: "center",
                  letterSpacing: "0.5em",
                  fontFamily: "var(--w-mono)",
                  paddingInlineStart: "0.5em",
                }}
                placeholder="••••••"
                required
                autoFocus
              />
            </div>

            {error ? (
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-err)" }}
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={pending}
            >
              {pending ? "Locking you in…" : "Verify & RSVP"}
            </Button>
          </form>
        </WFrame>
      </main>
    );
  }

  // ─────────── FORM ───────────
  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <ProgressStrip step={0} />
        <div
          style={{
            padding: "24px 20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href={`/e/${eventId}`}
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <Wordmark variant="monogrid" size={18} />
          <Chip tone="ghost">VIA INVITE</Chip>
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div className="w-type-meta">
            {fmtDate(night.night_date).toUpperCase()} · DOORS{" "}
            {fmtTime(night.doors_at).toUpperCase()}
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6 }}
          >
            {eventName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
            }}
          >
            <Avatar name="WL" size={22} />
            <span
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              Public list · GA credential
            </span>
          </div>
        </div>

        <div style={{ padding: "32px 20px 0" }}>
          <div className="w-type-h1">
            You&apos;re on the list.
            <br />
            <span style={{ color: "var(--w-fg-muted)" }}>
              Just need four things.
            </span>
          </div>
        </div>

        <form
          onSubmit={onSendCode}
          style={{
            padding: "20px 20px 0",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label htmlFor="fullName" className="w-label">
              FULL NAME
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-input"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="w-label">
              PHONE (FOR YOUR TICKET)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-input"
              placeholder="(305) 555 1234"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="w-label">
              EMAIL (OPTIONAL)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-input"
            />
          </div>

          <div>
            <label htmlFor="plusOnes" className="w-label">
              +1S
            </label>
            <select
              id="plusOnes"
              value={plusOnes}
              onChange={(e) => setPlusOnes(parseInt(e.target.value, 10))}
              className="w-input"
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Just me" : `+${n}`}
                </option>
              ))}
            </select>
            <p className="w-type-meta" style={{ marginTop: 8 }}>
              +1S APPROVED BY THE HOST · SUBJECT TO AVAILABILITY
            </p>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              style={{
                marginTop: 3,
                width: 16,
                height: 16,
                accentColor: "var(--w-acc)",
              }}
            />
            <span
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                lineHeight: 1.5,
              }}
            >
              I consent to receive SMS messages from WADL about my ticket and
              event updates. Reply STOP any time. Standard message rates
              apply.{" "}
              <Link
                href="/privacy"
                style={{ color: "var(--w-acc)", textDecoration: "underline" }}
              >
                Privacy
              </Link>
              .
            </span>
          </label>

          {error ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-err)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={pending}
          >
            {pending ? "Sending…" : "Text me the code"}
          </Button>
          <p
            className="w-type-meta"
            style={{
              textAlign: "center",
              color: "var(--w-fg-dim)",
              marginTop: 4,
            }}
          >
            NO ACCOUNT NEEDED · WE TEXT YOU THE QR
          </p>
        </form>
      </WFrame>
    </main>
  );
}

function ProgressStrip({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 20px",
        height: 2,
        marginTop: 0,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 2,
            background: i <= step ? "var(--w-acc)" : "#ffffff10",
          }}
        />
      ))}
    </div>
  );
}
