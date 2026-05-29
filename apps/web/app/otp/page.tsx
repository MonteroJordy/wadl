"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/v5";

function formatPhone(raw: string): string {
  // Show as +1 305 555 0123 if it parses, else as-is.
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
    if (verifyError) {
      setLoading(false);
      submittedRef.current = false;
      setError(verifyError.message);
      return;
    }

    // Honor an explicit ?next= on the OTP URL (e.g. user hit a paywalled
    // route, got bounced to /login → /otp, then expects to return).
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      router.replace(next);
      return;
    }

    // Otherwise route based on where the user is in onboarding so they
    // never land back on the marketing homepage after authenticating.
    const userId = verifyData.user?.id;
    let dest = "/owner";
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, account_id")
        .eq("id", userId)
        .maybeSingle<{ role: string | null; account_id: string | null }>();
      if (profile?.role === "guest") {
        dest = "/mytickets";
      } else if (!profile?.account_id) {
        // Incomplete signup — bounce back into the wizard.
        dest = "/signup";
      } else {
        dest = "/owner";
      }
    }
    setLoading(false);
    router.replace(dest);
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
      setResendCooldown(42);
    }
  }

  const digits = code.split("");

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-8)",
      }}
    >
      <div style={{ width: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <Logo size={20} />
        </div>

        <div className="t-display-md" style={{ marginTop: "var(--s-10)" }}>
          Enter the code
        </div>
        <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          Texted to{" "}
          <span style={{ color: "var(--fg)", whiteSpace: "nowrap" }}>
            {phone ? formatPhone(phone) : "your phone"}
          </span>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: "var(--s-6)" }}>
          {/* 6 digit boxes — visual; the real input sits transparently on
              top so paste / autocomplete / auto-submit logic is unchanged. */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 52,
                    height: 60,
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    border:
                      "1px solid " +
                      (i === digits.length
                        ? "var(--fg)"
                        : "var(--line-2)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 500,
                  }}
                >
                  {digits[i] ?? ""}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d*"
              maxLength={6}
              aria-label="6-digit code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              autoFocus
              aria-describedby="otp-helper"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "text",
                background: "transparent",
                border: 0,
              }}
            />
          </div>
          <p
            id="otp-helper"
            className="t-meta"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-4)" }}
          >
            Auto-verifies when all 6 digits are entered.
          </p>

          {error ? (
            <p
              className="t-body-2"
              style={{ color: "var(--err)", marginTop: "var(--s-2)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {resendMsg ? (
            <p
              className="t-body-2"
              style={{ color: "var(--ok)", marginTop: "var(--s-2)" }}
              role="status"
            >
              {resendMsg}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn--lg btn--accent btn--block"
            style={{ marginTop: "var(--s-6)" }}
            disabled={loading || code.length < 4}
            aria-busy={loading || undefined}
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div
          className="t-body-2"
          style={{ marginTop: "var(--s-4)", textAlign: "center" }}
        >
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              font: "inherit",
              color: resendCooldown > 0 ? "var(--fg-4)" : "var(--fg)",
              cursor: resendCooldown > 0 ? "default" : "pointer",
            }}
          >
            {resendCooldown > 0
              ? `Resend in 0:${String(resendCooldown).padStart(2, "0")}`
              : "Resend code"}
          </button>
        </div>

        <div style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="t-meta"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--fg-4)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Wrong number
          </button>
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
          className="v5"
          style={{ minHeight: "100vh", background: "var(--bg)" }}
        />
      }
    >
      <OtpInner />
    </Suspense>
  );
}
