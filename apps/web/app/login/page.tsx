"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { Cover, Logo } from "@/components/v5";

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
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* Left — the form */}
      <div
        style={{
          padding: "var(--s-16) var(--s-12)",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <Logo size={20} />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 420,
          }}
        >
          <div className="t-display-lg">Sign in</div>
          <div className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
            We&apos;ll text you a magic code. No password.
          </div>

          {/* Method toggle */}
          <div
            role="tablist"
            aria-label="Sign-in method"
            style={{
              display: "flex",
              gap: "var(--s-2)",
              marginTop: "var(--s-8)",
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
                  className={active ? "btn btn--sm" : "btn btn--ghost btn--sm"}
                  style={{ flex: 1 }}
                >
                  {t === "phone" ? "Phone code" : "Email link"}
                </button>
              );
            })}
          </div>

          {/* Form */}
          {tab === "phone" ? (
            <form
              onSubmit={onPhoneSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-3)",
                marginTop: "var(--s-3)",
              }}
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-label="Phone"
                placeholder="+1 305 799 0518"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                style={{ height: 52, fontSize: 15 }}
                required
              />
              {error ? <ErrorLine>{error}</ErrorLine> : null}
              <button
                className="btn btn--lg btn--block"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending code…" : "Send code"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={onEmailSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-3)",
                marginTop: "var(--s-3)",
              }}
            >
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label="Email"
                placeholder="you@venue.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                style={{ height: 52, fontSize: 15 }}
                required
              />
              {error ? <ErrorLine>{error}</ErrorLine> : null}
              {emailSent ? (
                <p className="t-body-2" style={{ color: "var(--ok)" }}>
                  Magic link sent to{" "}
                  <span style={{ color: "var(--fg)" }}>{emailSent}</span>. Check
                  your inbox.
                </p>
              ) : null}
              <button
                className="btn btn--lg btn--block"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}

          <div className="t-body-2" style={{ marginTop: "var(--s-5)" }}>
            No account?{" "}
            <a
              href="/signup"
              style={{
                color: "var(--fg)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Open a venue
            </a>
          </div>
        </div>

        <div className="t-meta" style={{ color: "var(--fg-4)" }}>
          By continuing you agree to{" "}
          <a
            href="/terms"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            Terms
          </a>{" "}
          ·{" "}
          <a
            href="/privacy"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            Privacy
          </a>
        </div>
      </div>

      {/* Right — full-height cover with live-event caption */}
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <Cover
          seed="signin v5"
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            borderRadius: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "var(--s-12)",
              bottom: "var(--s-12)",
              color: "#fff",
            }}
          >
            <div
              className="t-meta"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Live now
            </div>
            <div
              className="t-display-lg"
              style={{ marginTop: "var(--s-2)", color: "#fff" }}
            >
              BR · BK 023
            </div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-1)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              241 of 320 · scanning
            </div>
          </div>
        </Cover>
      </div>
    </main>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-body-2" style={{ color: "var(--err)" }} role="alert">
      {children}
    </p>
  );
}
