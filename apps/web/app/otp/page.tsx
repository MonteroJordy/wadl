"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, IconBack, Wordmark } from "@/components/wadl";

function formatPhone(raw: string): string {
  // Show as +1 (305) 555-0123 if it parses, else as-is.
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function OtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const submittedRef = useRef(false);

  // Cooldown countdown for the Resend button.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function verifyCode(token: string) {
    if (submittedRef.current) return;
    if (!phone) {
      setError("Missing phone. Start again from login.");
      return;
    }
    submittedRef.current = true;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    setLoading(false);
    if (verifyError) {
      submittedRef.current = false;
      setError(verifyError.message);
      return;
    }
    router.replace("/");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) {
      setError("Enter the code you received.");
      return;
    }
    await verifyCode(code);
  }

  // Auto-submit the moment 6 digits land in the input — paste-friendly
  // and removes the "now press verify" extra step.
  useEffect(() => {
    if (code.length === 6 && !loading && !submittedRef.current) {
      void verifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function onResend() {
    if (!phone || resendCooldown > 0) return;
    setResendMsg(null);
    setError(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (resendError) setError(resendError.message);
    else {
      setResendMsg("Code resent. Check your messages.");
      setResendCooldown(30);
    }
  }

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/login")}
          aria-label="Back to login"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--w-fg)",
            width: 36,
            height: 36,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 0 1px var(--w-line-2)",
            cursor: "pointer",
          }}
        >
          <IconBack />
        </button>
        <Wordmark variant="monogrid" size={18} />
        <div style={{ width: 36 }} />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 24px 96px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="w-type-meta">VERIFY</div>
          <div className="w-type-display-lg" style={{ marginTop: 12 }}>
            Enter
            <br />
            code.
          </div>
          <div
            className="w-type-body"
            style={{ color: "var(--w-fg-muted)", marginTop: 16 }}
          >
            Sent to{" "}
            <span style={{ color: "var(--w-fg)", whiteSpace: "nowrap" }}>
              {phone ? formatPhone(phone) : "your phone"}
            </span>
            .
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="code" className="w-label">
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                maxLength={6}
                placeholder="••••••"
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
                required
                autoFocus
                aria-describedby="otp-helper"
              />
              <p
                id="otp-helper"
                className="w-type-meta"
                style={{
                  marginTop: 8,
                  color: "var(--w-fg-dim)",
                }}
              >
                AUTO-VERIFIES WHEN ALL 6 DIGITS ARE ENTERED.
              </p>
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
            {resendMsg ? (
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-ok)" }}
                role="status"
              >
                {resendMsg}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={loading || code.length < 4}
              aria-busy={loading || undefined}
            >
              {loading ? "Verifying…" : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              block
              onClick={onResend}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </Button>
          </form>

          <div style={{ marginTop: 32 }}>
            <button
              onClick={() => router.push("/login")}
              className="w-type-meta"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--w-fg-dim)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← WRONG NUMBER
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          className="w-app"
          style={{ minHeight: "100vh", background: "var(--w-bg)" }}
        />
      }
    >
      <OtpInner />
    </Suspense>
  );
}
