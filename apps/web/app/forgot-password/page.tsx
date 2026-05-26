"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/v5";

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
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-8) var(--s-6)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "var(--s-8)",
        }}
      >
        <Logo size={20} />

        <div className="t-meta" style={{ marginTop: "var(--s-8)" }}>
          Reset access
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          Forgot how to get in?
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          Enter your email and we&apos;ll send a sign-in link. No password
          needed — just tap the link from the same device.
        </p>

        {sent ? (
          <div style={{ marginTop: "var(--s-6)" }}>
            <div
              className="card"
              style={{
                padding: "var(--s-4)",
                borderColor: "var(--ok)",
              }}
            >
              <div className="t-meta" style={{ color: "var(--ok)" }}>
                ✓ Link sent
              </div>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-2)", color: "var(--fg)" }}
              >
                We sent a sign-in link to{" "}
                <span style={{ fontWeight: 500 }}>{email.trim()}</span>. Check
                your inbox.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--lg btn--block"
              onClick={() => router.push("/login")}
              style={{ marginTop: "var(--s-3)" }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              marginTop: "var(--s-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <label
                htmlFor="email"
                className="t-meta"
                style={{ display: "block", marginBottom: "var(--s-2)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@venue.com"
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
              className="btn btn--lg btn--accent btn--block"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg btn--block"
              onClick={() => router.push("/login")}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
