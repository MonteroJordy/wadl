"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  async function onPhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError("Enter a valid phone number.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push(`/otp?phone=${encodeURIComponent(e164)}`);
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailSent(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/owner`,
      },
    });
    setLoading(false);
    if (emailError) {
      setError(emailError.message);
      return;
    }
    setEmailSent(trimmed);
  }

  return (
    <main
      id="main-content"
      className="min-h-screen w-full grid md:grid-cols-2 relative overflow-hidden"
    >
      <div
        className="hidden md:flex relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #14060a 0%, #0a0a0a 55%, #1c0703 100%)",
        }}
      >
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,74,43,0.45), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-32 w-[460px] h-[460px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(245,200,66,0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="font-display text-3xl text-coral tracking-wide">WADL</p>
          <p className="label-mono mt-2">One door · one list · one truth</p>
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-5xl text-cream uppercase leading-[0.95] tracking-wide mb-4">
            Door,<br />handled.
          </p>
          <p className="text-cream/70 text-sm leading-relaxed">
            Replaces WhatsApp + spreadsheet chaos at every venue&apos;s door.
            Every guest attributed, every promoter graded, every list closed
            on time.
          </p>
        </div>
        <p className="relative label-mono">Miami · Wynwood · LA · NYC · soon</p>
      </div>

      <div className="relative flex flex-col px-6 md:px-12 py-10 md:py-14 max-w-md w-full md:max-w-none mx-auto md:mx-0 md:justify-center">
        <p className="label-mono mb-3 md:hidden">WADL</p>
        <h1 className="font-display text-4xl md:text-5xl text-cream uppercase leading-[0.95] tracking-wide mb-2 md:hidden">
          Door,<br />handled.
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8 md:mb-10 max-w-[360px] md:hidden">
          One list. One QR. Every guest attributed.
        </p>

        <div className="md:max-w-sm">
        <p className="label-mono mb-2 hidden md:block">Sign in</p>
        <h2 className="font-display text-3xl text-cream uppercase tracking-wide mb-6 hidden md:block">
          Get to work.
        </h2>

      <div className="flex gap-1 mt-10 mb-2">
        {(["phone", "email"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
              setEmailSent(null);
            }}
            className={`flex-1 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
              tab === t
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted"
            }`}
          >
            {t === "phone" ? "Phone OTP" : "Email link"}
          </button>
        ))}
      </div>

      {tab === "phone" ? (
        <form onSubmit={onPhoneSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="label-mono block mb-2">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(305) 799 0518"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-dark"
              required
            />
          </div>
          {error && <p className="text-coral text-sm font-sans">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending code…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={onEmailSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="label-mono block mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@venue.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              required
            />
          </div>
          {error && <p className="text-coral text-sm font-sans">{error}</p>}
          {emailSent && (
            <p className="text-mint text-sm">
              Magic link sent to <span className="text-cream">{emailSent}</span>. Check your inbox.
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      <p className="label-mono mt-8 md:mt-10">
          By continuing you agree to our{" "}
          <a href="/terms" className="text-coral hover:text-cream underline">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-coral hover:text-cream underline">
            privacy policy
          </a>
          .
        </p>
        </div>
      </div>
    </main>
  );
}
