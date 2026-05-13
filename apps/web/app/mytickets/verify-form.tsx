"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import { Button } from "@/components/wadl";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

export default function MyTicketsVerify() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) return setError("Enter a valid phone number.");
    setE164(normalized);

    const supabase = createClient();
    startTransition(async () => {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: normalized,
      });
      if (err) setError(err.message);
      else setStep("code");
    });
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!e164) return setError("Start over.");
    if (code.length < 4) return setError("Enter the code.");

    const supabase = createClient();
    startTransition(async () => {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code,
        type: "sms",
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.refresh();
    });
  }

  if (step === "code") {
    return (
      <form
        onSubmit={onVerify}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: 24,
        }}
      >
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          Sent to <span style={{ color: "var(--w-fg)" }}>{e164}</span>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{
            ...INPUT_STYLE,
            letterSpacing: "0.5em",
            textAlign: "center",
            fontSize: 24,
          }}
          placeholder="••••••"
          required
        />
        {error && (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-err)" }}
          >
            {error}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Verifying…" : "See my tickets"}
        </Button>
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--w-fg-muted)",
            textAlign: "center",
            padding: 0,
          }}
        >
          ← WRONG NUMBER
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSendCode}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginTop: 24,
      }}
    >
      <div>
        <label
          htmlFor="phone"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          PHONE
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={INPUT_STYLE}
          placeholder="(305) 555 1234"
          required
        />
      </div>
      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)" }}
        >
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
