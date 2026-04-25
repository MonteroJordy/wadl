"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/types";

const ACCOUNT_TYPES: { id: AccountType; label: string; blurb: string }[] = [
  { id: "venue",      label: "Venue",      blurb: "Club, bar, rooftop" },
  { id: "brand",      label: "Brand",      blurb: "Label, agency, series" },
  { id: "individual", label: "Individual", blurb: "Promoter, artist, host" },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill email/name from existing profile if user revisits the page.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.email) setEmail(profile.email);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Enter your full name.");
    if (!accountType) return setError("Pick an account type.");

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      setError("Session expired. Log in again.");
      return;
    }

    // Email on auth.users (phone-OTP users don't have one yet).
    if (email.trim()) {
      await supabase.auth.updateUser({ email: email.trim() });
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        email: email.trim() || null,
        role: "owner",
      })
      .eq("id", user.id);

    setLoading(false);
    if (profileErr) {
      setError(profileErr.message);
      return;
    }

    // Pass chosen account_type forward so entitysetup can create the account.
    router.push(`/entitysetup?type=${accountType}`);
  }

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">01 / Account</p>
        <h1 className="display-xl mb-2">Who are<br/>you?</h1>
      </div>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
        <div>
          <label htmlFor="fullName" className="label-mono block mb-2">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-dark"
            placeholder="Jordy Montero"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label-mono block mb-2">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-dark"
            placeholder="you@venue.com"
          />
        </div>

        <div>
          <p className="label-mono mb-3">Account type</p>
          <div className="flex flex-col gap-2">
            {ACCOUNT_TYPES.map((t) => {
              const active = accountType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAccountType(t.id)}
                  className={`w-full text-left border rounded-md px-4 py-4 transition ${
                    active
                      ? "border-coral bg-s2"
                      : "border-line bg-s1 hover:border-cream/20"
                  }`}
                >
                  <div className="font-sans font-semibold text-cream">
                    {t.label}
                  </div>
                  <div className="text-muted text-xs mt-1">{t.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Saving…" : "Continue"}
        </button>

        <p className="label-mono mt-2 text-center">
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
      </form>
    </main>
  );
}
