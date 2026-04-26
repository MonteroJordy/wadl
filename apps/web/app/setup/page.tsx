"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/types";

const ACCOUNT_TYPES: {
  id: AccountType;
  label: string;
  blurb: string;
  accent: string;
  example: string;
}[] = [
  {
    id: "venue",
    label: "Venue",
    blurb: "Club, bar, rooftop",
    accent: "border-coral",
    example: "Wynwood Studios",
  },
  {
    id: "brand",
    label: "Brand",
    blurb: "Label, agency, series",
    accent: "border-gold",
    example: "Mainframe",
  },
  {
    id: "individual",
    label: "Individual",
    blurb: "Promoter, artist, host",
    accent: "border-mint",
    example: "DJ Diplo",
  },
];

/**
 * Unified onboarding screen. Replaces the old /signup → /entitysetup →
 * /venuesetup path with one form. The brief said "5 minutes to first
 * guest list." This is the screen that delivers on that.
 *
 * On submit:
 *  1. Updates profiles.full_name + email + role=owner
 *  2. Inserts an accounts row (account_type, display_name, owner_user_id)
 *  3. Updates profiles.account_id
 *  4. If account_type=venue: inserts a venues row
 *  5. Redirects to /welcome (the 5-step wizard) — kept for now to set
 *     onboarding_completed_at via its own flow.
 */
export default function SetupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [accountName, setAccountName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("Miami");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

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
        .select("full_name, email, account_id")
        .eq("id", user.id)
        .maybeSingle<{
          full_name: string | null;
          email: string | null;
          account_id: string | null;
        }>();
      if (profile?.account_id) {
        // Already setup — bounce to home.
        router.replace("/");
        return;
      }
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.email) setEmail(profile.email);
      setBootstrapped(true);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimName = fullName.trim();
    const trimAccount = accountName.trim();
    const trimVenue = venueName.trim();
    const trimCity = venueCity.trim();

    if (!trimName) return setError("Enter your full name.");
    if (!accountType) return setError("Pick what you run.");
    if (!trimAccount) return setError("Name your account.");
    if (accountType === "venue" && !trimVenue) {
      return setError("Name your venue.");
    }

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setLoading(false);
      setError("Session expired. Log in again.");
      return;
    }

    // 1. Profile name + email + role.
    const trimEmail = email.trim();
    if (trimEmail) {
      await supabase.auth.updateUser({ email: trimEmail });
    }
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: trimName,
        email: trimEmail || null,
        role: "owner",
      })
      .eq("id", user.id);
    if (profileErr) {
      setLoading(false);
      setError(profileErr.message);
      return;
    }

    // 2. Account row.
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .insert({
        account_type: accountType,
        display_name: trimAccount,
        owner_user_id: user.id,
      })
      .select("id")
      .single();
    if (accErr || !account) {
      setLoading(false);
      setError(accErr?.message ?? "Couldn't create account.");
      return;
    }

    // 3. Link profile → account.
    await supabase
      .from("profiles")
      .update({ account_id: account.id })
      .eq("id", user.id);

    // 4. Optional venue.
    if (accountType === "venue") {
      const { error: venueErr } = await supabase.from("venues").insert({
        account_id: account.id,
        name: trimVenue,
        city: trimCity || null,
      });
      if (venueErr) {
        setLoading(false);
        setError(`Account created, but venue failed: ${venueErr.message}`);
        return;
      }
    }

    setLoading(false);
    // Forward to the welcome wizard for the 5-step intro + first event seed.
    router.replace("/welcome");
  }

  if (!bootstrapped) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="label-mono text-coral">Loading…</p>
      </main>
    );
  }

  const selected = ACCOUNT_TYPES.find((t) => t.id === accountType);

  return (
    <main
      id="main-content"
      className="min-h-screen w-full grid md:grid-cols-2 relative overflow-hidden"
    >
      {/* Brand panel */}
      <div
        className="hidden md:flex relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #14060a 0%, #0a0a0a 55%, #1c0703 100%)",
        }}
      >
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,74,43,0.45), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-32 w-[460px] h-[460px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(245,200,66,0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="font-display text-3xl text-coral tracking-wide">WADL</p>
          <p className="label-mono mt-2">One door · one list · one truth</p>
        </div>
        <div className="relative max-w-md">
          <p className="font-display text-5xl text-cream uppercase leading-[0.95] tracking-wide mb-4">
            Two minutes
            <br />
            to a real list.
          </p>
          <p className="text-cream/70 text-sm leading-relaxed">
            One form. We&apos;ll build your account, your venue, and seed your
            first event. You&apos;ll be on a real door this Friday.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 max-w-md text-cream/80">
          <div>
            <p className="font-display text-3xl text-coral leading-none">2m</p>
            <p className="label-mono mt-1 text-cream/60">setup</p>
          </div>
          <div>
            <p className="font-display text-3xl text-coral leading-none">0</p>
            <p className="label-mono mt-1 text-cream/60">forms after</p>
          </div>
          <div>
            <p className="font-display text-3xl text-coral leading-none">1</p>
            <p className="label-mono mt-1 text-cream/60">page total</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex flex-col px-6 md:px-12 py-8 md:py-14 max-w-xl w-full md:max-w-none mx-auto md:justify-center">
        <header className="mb-6">
          <p className="label-mono mb-1">Setup</p>
          <h1 className="font-display text-4xl md:text-5xl text-cream uppercase leading-[0.95] tracking-wide">
            Build your<br />account.
          </h1>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 md:max-w-md">
          <div>
            <label htmlFor="fullName" className="label-mono block mb-2">
              Your name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordy Montero"
              className="input-dark"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="label-mono block mb-2">
              Email <span className="text-muted">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yours.com"
              className="input-dark"
            />
          </div>

          <div>
            <p className="label-mono mb-2">What do you run?</p>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const active = accountType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setAccountType(t.id);
                      // Smart-fill the placeholder example.
                      if (!accountName) setAccountName("");
                      if (t.id !== "venue") setVenueName("");
                    }}
                    className={`p-3 rounded-lg border text-left transition ${
                      active
                        ? `${t.accent} bg-s2`
                        : "border-line bg-s1 hover:border-cream/30"
                    }`}
                  >
                    <p
                      className={`font-display text-xl uppercase tracking-wide ${
                        active ? "text-cream" : "text-muted"
                      }`}
                    >
                      {t.label}
                    </p>
                    <p className="label-mono mt-1 leading-tight">{t.blurb}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {accountType && (
            <div>
              <label htmlFor="accountName" className="label-mono block mb-2">
                {accountType === "venue"
                  ? "Account name (your company)"
                  : accountType === "brand"
                  ? "Brand name"
                  : "Display name"}
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={selected?.example ?? ""}
                className="input-dark"
                required
              />
            </div>
          )}

          {accountType === "venue" && (
            <>
              <div>
                <label htmlFor="venueName" className="label-mono block mb-2">
                  Venue name
                </label>
                <input
                  id="venueName"
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Wynwood Studios"
                  className="input-dark"
                  required
                />
              </div>
              <div>
                <label htmlFor="venueCity" className="label-mono block mb-2">
                  City
                </label>
                <input
                  id="venueCity"
                  type="text"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  placeholder="Miami"
                  className="input-dark"
                />
              </div>
            </>
          )}

          {error && <p className="text-coral text-sm">{error}</p>}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? "Building…" : "Build account →"}
          </button>

          <p className="label-mono mt-2">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-coral hover:text-cream underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-coral hover:text-cream underline">
              privacy
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
