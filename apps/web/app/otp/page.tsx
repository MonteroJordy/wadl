"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, IconBack, Wordmark } from "@/components/wadl";

function OtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!phone) {
      setError("Missing phone. Start again from login.");
      return;
    }
    if (code.length < 4) {
      setError("Enter the code you received.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace("/");
  }

  async function onResend() {
    if (!phone) return;
    setResendMsg(null);
    setError(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (resendError) setError(resendError.message);
    else setResendMsg("Code resent.");
  }

  return (
    <main
      id="main-content"
      className="w-app w-frame"
      style={{ paddingBottom: 32 }}
    >
      <div
        style={{
          padding: "20px 24px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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

      <div style={{ padding: "72px 24px 0" }}>
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
          <span style={{ color: "var(--w-fg)" }}>
            {phone || "your phone"}
          </span>
          .
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          padding: "40px 24px 0",
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
          disabled={loading}
        >
          {loading ? "Verifying…" : "Verify"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          block
          onClick={onResend}
        >
          Resend code
        </Button>
      </form>

      <div style={{ marginTop: "auto", padding: "32px 24px 16px" }}>
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
    </main>
  );
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={<main id="main-content" className="w-app w-frame" />}
    >
      <OtpInner />
    </Suspense>
  );
}
