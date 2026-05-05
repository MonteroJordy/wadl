"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Wordmark } from "@/components/wadl";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // We use Supabase's signInWithOtp (magic link) as the reset path —
    // simpler than a separate password-reset flow and matches our auth
    // model (passwordless first, password fallback).
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 32,
          background: "var(--w-surface-2)",
          border: "1px solid var(--w-line)",
        }}
      >
        <Wordmark variant="monogrid" size={20} />

        <div className="w-type-meta" style={{ marginTop: 32 }}>
          RESET ACCESS
        </div>
        <div
          style={{
            fontFamily: "var(--w-display)",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.02em",
            marginTop: 8,
          }}
        >
          Forgot how to get in?
        </div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 8,
            lineHeight: 1.55,
          }}
        >
          Enter your email and we&apos;ll send a sign-in link. No password
          needed — just tap the link from the same device.
        </p>

        {sent ? (
          <div style={{ marginTop: 24 }}>
            <div
              className="w-card"
              style={{
                padding: 16,
                borderColor: "var(--w-acc)",
                background: "var(--w-acc-soft)",
              }}
            >
              <div
                className="w-type-meta"
                style={{ color: "var(--w-acc-ink)" }}
              >
                ✓ LINK SENT
              </div>
              <p
                className="w-type-body-sm"
                style={{ marginTop: 8, color: "var(--w-fg)" }}
              >
                We sent a sign-in link to{" "}
                <strong>{email.trim()}</strong>. Check your inbox.
              </p>
            </div>
            <Button
              variant="ghost"
              size="lg"
              block
              onClick={() => router.push("/login")}
              style={{ marginTop: 12 }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="email" className="w-label">
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-input"
                placeholder="you@venue.com"
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
              disabled={loading}
            >
              {loading ? "Sending…" : "Send sign-in link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              block
              onClick={() => router.push("/login")}
            >
              Back to sign in
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
