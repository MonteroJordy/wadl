"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Wordmark } from "@/components/wadl";

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", top: 24, left: 32 }}>
        <Wordmark variant="monogrid" size={18} />
      </div>

      <div
        style={{
          width: 64,
          height: 64,
          background: "var(--w-acc)",
          color: "var(--w-acc-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        ✉
      </div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: "clamp(40px, 6vw, 56px)",
          letterSpacing: "-0.03em",
          marginTop: 28,
          lineHeight: 1,
        }}
      >
        Check your email.
      </div>
      <p
        className="w-type-body"
        style={{
          color: "var(--w-fg-muted)",
          marginTop: 14,
          maxWidth: 520,
          fontSize: 17,
          lineHeight: 1.55,
        }}
      >
        We sent a sign-in link
        {email ? (
          <>
            {" "}to{" "}
            <strong style={{ color: "var(--w-fg)" }}>{email}</strong>
          </>
        ) : null}
        . The link works for 15 minutes, on this device or any other.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 32, flexWrap: "wrap" }}>
        <Button
          variant="ghost"
          size="lg"
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
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => router.push("/login")}
        >
          Use different email
        </Button>
      </div>

      <div
        className="w-type-meta"
        style={{ marginTop: 40, color: "var(--w-fg-dim)", maxWidth: 520 }}
      >
        NO EMAIL? CHECK SPAM · GMAIL PROMOTIONS · OR{" "}
        <Link
          href="/contact"
          style={{ color: "var(--w-acc)", textDecoration: "none" }}
        >
          EMAIL US
        </Link>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<main id="main-content" className="w-app w-frame" />}
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
