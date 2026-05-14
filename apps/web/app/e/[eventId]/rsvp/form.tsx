"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { completeRsvpAction } from "./actions";
import { fmtDate, fmtTime } from "@/lib/format";
import { Cover, Logo } from "@/components/v5";

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

const SHELL_STYLE: React.CSSProperties = {
  marginInline: "auto",
  width: "100%",
  maxWidth: 420,
  minHeight: "100vh",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  paddingBottom: "var(--s-12)",
};

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

  const tierLabel = (tier ?? "ga").toUpperCase();

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

  // ─────────── SUCCESS ───────────
  if (step === "success" && success) {
    return (
      <main id="main-content" className="v5">
        <div style={SHELL_STYLE}>
          <ProgressStrip step={2} />
          <div
            style={{
              padding: "var(--s-6) var(--s-5) 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Logo size={18} />
            <span className="chip chip--ok">You&apos;re in</span>
          </div>
          <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
            <div className="t-meta">Credential · {tierLabel}</div>
            <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
              {success.status === "approved"
                ? "Show this at the door."
                : "Sent for review."}
            </div>
            <p
              className="t-body-2"
              style={{ marginTop: "var(--s-2)" }}
            >
              {success.status === "approved"
                ? "You're locked in. We texted your QR — show it at the door."
                : "The host needs to approve this. We sent your QR anyway; it activates once approved."}
            </p>
          </div>

          <div style={{ padding: "var(--s-5) var(--s-5) 0" }}>
            <div className="card" style={{ borderColor: "var(--fg)" }}>
              <Cover seed={eventName} height={140}>
                <div
                  style={{
                    position: "absolute",
                    left: "var(--s-4)",
                    right: "var(--s-4)",
                    bottom: "var(--s-4)",
                  }}
                >
                  <div
                    className="t-meta"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {fmtDate(night.night_date)} · doors{" "}
                    {fmtTime(night.doors_at)}
                  </div>
                  <div
                    className="t-h1"
                    style={{ color: "#fff", marginTop: "var(--s-1)" }}
                  >
                    {eventName}
                  </div>
                </div>
              </Cover>
              <div
                style={{
                  padding: "var(--s-4)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span className="t-h2">{fullName.trim() || "Guest"}</span>
                <span className="chip chip--solid">{tierLabel}</span>
              </div>
            </div>
          </div>

          {success.smsProvider === "dev" && (
            <div style={{ padding: "var(--s-4) var(--s-5) 0" }}>
              <div
                className="card"
                style={{
                  padding: "var(--s-4)",
                  borderColor: "var(--warn)",
                }}
              >
                <span className="chip chip--warn">Dev mode</span>
                <p
                  className="t-body-2"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  SMS logged to server console, not sent. Tap See your QR or
                  check /mytickets.
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              padding: "var(--s-5) var(--s-5) 0",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            <Link
              href={success.ticketUrl.replace(
                typeof window !== "undefined" ? window.location.origin : "",
                "",
              )}
              className="btn btn--lg btn--block"
              style={{ textDecoration: "none" }}
            >
              See your QR
            </Link>
            <Link
              href="/mytickets"
              className="btn btn--ghost btn--lg btn--block"
              style={{ textDecoration: "none" }}
            >
              My tickets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ─────────── OTP ───────────
  if (step === "otp") {
    return (
      <main id="main-content" className="v5">
        <div style={SHELL_STYLE}>
          <ProgressStrip step={1} />
          <div
            style={{
              padding: "var(--s-6) var(--s-5) 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => setStep("form")}
              className="t-meta"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--fg-3)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← Back
            </button>
            <Logo size={18} />
            <span className="t-meta">Verify</span>
          </div>

          <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
            <div className="t-meta">Verify</div>
            <div
              className="t-display-md"
              style={{ marginTop: "var(--s-2)", lineHeight: 1.0 }}
            >
              Enter code.
            </div>
            <p
              className="t-body"
              style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
            >
              Sent to{" "}
              <span style={{ color: "var(--fg)" }}>{e164Phone}</span>.
            </p>
          </div>

          <form
            onSubmit={onVerify}
            style={{
              padding: "var(--s-8) var(--s-5) 0",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <label
                htmlFor="code"
                className="t-meta"
                style={{ display: "block", marginBottom: "var(--s-2)" }}
              >
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
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="input"
                style={{
                  height: 64,
                  fontSize: 28,
                  textAlign: "center",
                  letterSpacing: "0.5em",
                  fontFamily: "var(--mono)",
                  paddingInlineStart: "0.5em",
                }}
                placeholder="••••••"
                required
                autoFocus
              />
            </div>

            {error ? (
              <p
                className="t-body-2"
                style={{ color: "var(--err)" }}
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn--lg btn--block"
              disabled={pending}
            >
              {pending ? "Locking you in…" : "Verify & RSVP"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ─────────── FORM ───────────
  return (
    <main id="main-content" className="v5">
      <div style={SHELL_STYLE}>
        <ProgressStrip step={0} />
        <div
          style={{
            padding: "var(--s-6) var(--s-5) 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href={`/e/${eventId}`}
            className="t-meta"
            style={{ textDecoration: "none", color: "var(--fg-3)" }}
          >
            ← Back
          </Link>
          <Logo size={18} />
          <span className="chip">Via invite</span>
        </div>

        <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
          <div className="t-meta">
            {fmtDate(night.night_date)} · doors {fmtTime(night.doors_at)}
          </div>
          <div
            className="t-display-md"
            style={{ marginTop: "var(--s-2)" }}
          >
            {eventName}
          </div>
          <div
            className="t-body-2"
            style={{ marginTop: "var(--s-2)" }}
          >
            Public list · {tierLabel} credential
          </div>
        </div>

        <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
          <div className="t-h1">
            You&apos;re on the list.
            <br />
            <span style={{ color: "var(--fg-3)" }}>
              Just need four things.
            </span>
          </div>
        </div>

        <form
          onSubmit={onSendCode}
          style={{
            padding: "var(--s-5) var(--s-5) 0",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <label
              htmlFor="fullName"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Phone (for your ticket)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="input"
              placeholder="(305) 555 1234"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Party of
            </label>
            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              {[0, 1, 2, 3].map((n) => {
                const active = plusOnes === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlusOnes(n)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: "var(--r-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${active ? "var(--fg)" : "var(--line-2)"}`,
                      background: active ? "var(--fg)" : "transparent",
                      color: active ? "var(--bg)" : "var(--fg)",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {n + 1}
                  </button>
                );
              })}
            </div>
            <p className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              +1s approved by the host · subject to availability
            </p>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--s-3)",
              cursor: "pointer",
              marginTop: "var(--s-1)",
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
                accentColor: "var(--fg)",
              }}
            />
            <span
              className="t-body-2"
              style={{ lineHeight: 1.5 }}
            >
              I consent to receive SMS messages from WADL about my ticket and
              event updates. Reply STOP any time. Standard message rates
              apply.{" "}
              <Link
                href="/privacy"
                style={{ color: "var(--fg)", textDecoration: "underline" }}
              >
                Privacy
              </Link>
              .
            </span>
          </label>

          {error ? (
            <p
              className="t-body-2"
              style={{ color: "var(--err)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn--lg btn--block"
            disabled={pending}
          >
            {pending ? "Sending…" : "Text me the code"}
          </button>
          <p
            className="t-meta"
            style={{
              textAlign: "center",
              color: "var(--fg-4)",
              marginTop: "var(--s-1)",
            }}
          >
            No account needed · we text you the QR
          </p>
        </form>
      </div>
    </main>
  );
}

function ProgressStrip({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 var(--s-5)",
        height: 2,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 2,
            background: i <= step ? "var(--fg)" : "var(--line-2)",
          }}
        />
      ))}
    </div>
  );
}
