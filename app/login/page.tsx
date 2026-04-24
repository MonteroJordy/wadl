"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">WADL</p>
        <h1 className="display-xl mb-2">Door,<br/>handled.</h1>
        <p className="text-muted text-sm leading-relaxed mt-4 max-w-[300px]">
          One list. One QR. Every guest attributed.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-12 flex flex-col gap-4">
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

        {error && (
          <p className="text-coral text-sm font-sans">{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Sending code…" : "Send code"}
        </button>
      </form>

      <p className="label-mono mt-auto pt-8 text-center">
        By continuing you agree to the door rules.
      </p>
    </main>
  );
}
