"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    // Root page decides the next onboarding step based on profile state.
    router.replace("/");
  }

  async function onResend() {
    if (!phone) return;
    setResendMsg(null);
    setError(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({ phone });
    if (resendError) setError(resendError.message);
    else setResendMsg("Code resent.");
  }

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">Verify</p>
        <h1 className="display-xl mb-4">Enter code.</h1>
        <p className="text-muted text-sm">
          Sent to <span className="text-cream">{phone || "your phone"}</span>.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-12 flex flex-col gap-4">
        <div>
          <label htmlFor="code" className="label-mono block mb-2">
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
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="input-dark tracking-[0.5em] text-center text-2xl"
            required
          />
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}
        {resendMsg && <p className="text-mint text-sm">{resendMsg}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Verifying…" : "Verify"}
        </button>

        <button type="button" onClick={onResend} className="btn-ghost">
          Resend code
        </button>
      </form>

      <button
        onClick={() => router.push("/login")}
        className="label-mono mt-auto pt-8 text-center hover:text-cream transition"
      >
        ← Wrong number
      </button>
    </main>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<main className="mobile-frame" />}>
      <OtpInner />
    </Suspense>
  );
}
