"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/v5";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [seconds, setSeconds] = useState(60);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function onResend() {
    if (!email || seconds > 0) return;
    setResending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    setResent(true);
    setSeconds(60);
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-8)",
        textAlign: "center",
      }}
    >
      <div
        style={{ position: "absolute", top: "var(--s-6)", left: "var(--s-8)" }}
      >
        <Logo size={20} />
      </div>

      <div style={{ width: 420, maxWidth: "100%" }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto",
            borderRadius: "var(--r-md)",
            background: "var(--fg)",
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          ✉
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-8)" }}>
          Check your email.
        </div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            marginInline: "auto",
            maxWidth: 420,
          }}
        >
          We sent a sign-in link
          {email ? (
            <>
              {" "}
              to <span style={{ color: "var(--fg)" }}>{email}</span>
            </>
          ) : null}
          . The link works for 15 minutes, on this device or any other.
        </p>

        <div
          style={{
            display: "flex",
            gap: "var(--s-2)",
            marginTop: "var(--s-8)",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost btn--lg"
            disabled={seconds > 0 || resending || !email}
            onClick={onResend}
          >
            {resending
              ? "Resending…"
              : seconds > 0
                ? `Resend in ${fmt(seconds)}`
                : resent
                  ? "Resent ✓"
                  : "Resend now"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--lg"
            onClick={() => router.push("/login")}
          >
            Use different email
          </button>
        </div>

        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-10)",
            color: "var(--fg-4)",
          }}
        >
          No email? Check spam · Gmail Promotions · or{" "}
          <Link
            href="/contact"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            email us
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailInner />
    </Suspense>
  );
}
