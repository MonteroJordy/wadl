"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { Button, Wordmark } from "@/components/wadl";

type AuthTab = "phone" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("phone");
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
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: e164,
    });
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
      options: { emailRedirectTo: `${window.location.origin}/owner` },
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
      className="w-app w-frame"
      style={{ paddingBottom: 32 }}
    >
      <div style={{ padding: "20px 24px 0" }}>
        <Wordmark variant="monogrid" size={20} />
      </div>

      <div style={{ padding: "72px 24px 0" }}>
        <div className="w-type-display-lg">
          The door,
          <br />
          de-jammed.
        </div>
        <div
          className="w-type-body"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 16,
            maxWidth: 320,
          }}
        >
          Sign in or create an account in seconds. Phone or email — we&apos;ll
          send you a code.
        </div>
      </div>

      {/* Tab toggle */}
      <div
        role="tablist"
        aria-label="Sign-in method"
        style={{
          display: "flex",
          gap: 8,
          padding: "32px 24px 0",
        }}
      >
        {(["phone", "email"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
                setEmailSent(null);
              }}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9999,
                border: 0,
                fontFamily: "var(--w-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: active ? "var(--w-acc)" : "transparent",
                color: active ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                boxShadow: active
                  ? "none"
                  : "inset 0 0 0 1px var(--w-line-2)",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {t === "phone" ? "Phone OTP" : "Email link"}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div style={{ padding: "16px 24px 0" }}>
        {tab === "phone" ? (
          <form
            onSubmit={onPhoneSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <label htmlFor="phone" className="w-label">
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
                className="w-input"
                style={{ height: 56, fontSize: 16 }}
                required
              />
            </div>
            {error ? <ErrorLine>{error}</ErrorLine> : null}
            <Button
              variant="primary"
              size="lg"
              block
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending code…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={onEmailSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <label htmlFor="email" className="w-label">
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
                className="w-input"
                style={{ height: 56, fontSize: 16 }}
                required
              />
            </div>
            {error ? <ErrorLine>{error}</ErrorLine> : null}
            {emailSent ? (
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-ok)" }}
              >
                Magic link sent to{" "}
                <span style={{ color: "var(--w-fg)" }}>{emailSent}</span>.
                Check your inbox.
              </p>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              block
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>

      <div
        style={{
          padding: "32px 24px 24px",
          marginTop: "auto",
          textAlign: "center",
        }}
      >
        <span className="w-type-meta" style={{ color: "var(--w-fg-dim)" }}>
          BY CONTINUING YOU AGREE TO{" "}
          <a
            href="/terms"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            TERMS
          </a>{" "}
          ·{" "}
          <a
            href="/privacy"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            PRIVACY
          </a>
        </span>
      </div>
    </main>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="w-type-body-sm"
      style={{ color: "var(--w-err)", marginTop: -4 }}
      role="alert"
    >
      {children}
    </p>
  );
}
