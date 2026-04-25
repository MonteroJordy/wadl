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
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">WADL</p>
        <h1 className="display-xl mb-2">Door,<br/>handled.</h1>
        <p className="text-muted text-sm leading-relaxed mt-4 max-w-[300px]">
          One list. One QR. Every guest attributed.
        </p>
      </div>

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

      <p className="label-mono mt-auto pt-8 text-center">
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
    </main>
  );
}
