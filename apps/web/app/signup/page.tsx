"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import type { AccountType } from "@/lib/types";
import { Logo } from "@/components/v5";

// ════════════════════════════════════════════════════════════════════
// v5.2 onboarding wizard. Auth happens IN the wizard at the OTP step.
//
// Visible steps (V5DashboardFirstRun lives separately at /onboarding/done):
//  0  Role pick     — V5OnboardEntry  : venue / brand / promoter / guest
//                     "guest" short-circuits to /discover.
//  1  Phone         — V5OnboardPhone  : single field + Continue
//  2  Verify        — 6-digit OTP
//  3  Welcome + name — V5OnboardWelcome : context-aware copy, name input
//                     promoter → /owner (lightweight, no venue setup).
//  4  Venue setup   — V5VenueSetup   : name + city + default_capacity
//                     venue/brand → /onboarding/done (first-run dashboard)
// ════════════════════════════════════════════════════════════════════

type Step = 0 | 1 | 2 | 3 | 4;

// UI-level role choice. AccountType only has venue|brand|individual, so we
// thread "promoter" / "guest" as choice-only labels and map to AccountType
// when we write to the DB (promoter → individual; guest never writes).
type RoleChoice = "venue" | "brand" | "promoter" | "guest";

const VISIBLE_TOTAL = 4; // 4 visible steps after role pick (incl. role pick)

const ROLE_CARDS: ReadonlyArray<{
  choice: RoleChoice;
  title: string;
  sub: string;
}> = [
  { choice: "venue", title: "I run a venue", sub: "Recurring nights · own door" },
  { choice: "brand", title: "I run a brand", sub: "One-off productions · co-host venues" },
  { choice: "promoter", title: "I promote", sub: "Build lists · share invites · no signup needed" },
  { choice: "guest", title: "I'm a guest", sub: "Tap an invite link · I'm already in" },
];

// Map UI role choice → DB AccountType. "guest" never reaches the DB.
function roleToAccountType(role: RoleChoice): AccountType | null {
  if (role === "venue") return "venue";
  if (role === "brand") return "brand";
  if (role === "promoter") return "individual";
  return null;
}

// Welcome step copy keyed to role choice (mirrors V5OnboardWelcome).
const WELCOME_COPY: Record<
  RoleChoice,
  { title: string; sub: string; cta: string }
> = {
  venue: {
    title: "Welcome",
    sub: "Let's open your door. Two questions and you're live.",
    cta: "Set up venue",
  },
  brand: {
    title: "Welcome",
    sub: "Let's set up your brand. Co-hosts and productions appear automatically.",
    cta: "Set up brand",
  },
  promoter: {
    title: "You're in",
    sub: "Lists you're assigned to will appear here. Wait for an invite, or build your own.",
    cta: "Continue",
  },
  guest: {
    title: "You're in",
    sub: "Your passes live here. Tap any invite link to RSVP.",
    cta: "Open wallet",
  },
};

// Safe `?next=` — only same-site relative paths are honored.
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SignupWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const nextHref = safeNext(search.get("next"));

  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [e164Phone, setE164Phone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueCap, setVenueCap] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // After venue/brand finish (with or without venue): land on the next
  // query param if provided, else the first-run dashboard.
  const postDoneHref = nextHref ?? "/onboarding/done";
  // Promoter / already-onboarded: land on the next param if provided, else
  // the owner dashboard.
  const postOwnerHref = nextHref ?? "/owner";

  // Resume mid-flow: if user is already authenticated but onboarding is
  // incomplete (no full_name or no account_id), drop them at the right
  // step instead of starting over. Mirrors the previous file's behavior.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, account_id, accounts(account_type)")
        .eq("id", user.id)
        .maybeSingle<{
          full_name: string | null;
          account_id: string | null;
          accounts: { account_type: AccountType } | null;
        }>();

      if (profile?.full_name && profile.account_id) {
        // Already onboarded. If venue + no venue row, drop into step 4 so
        // they can add one. Otherwise straight to dashboard / next.
        if (profile.accounts?.account_type === "venue") {
          const { count } = await supabase
            .from("venues")
            .select("id", { count: "exact", head: true })
            .eq("account_id", profile.account_id);
          if ((count ?? 0) === 0) {
            setRole("venue");
            setFullName(profile.full_name);
            setStep(4);
            return;
          }
        }
        router.replace(postOwnerHref);
        return;
      }
      if (profile?.full_name) setFullName(profile.full_name);
    })();
    // Pre-select role from query string if landing from a CTA. Accepts
    // the legacy ?type=… (venue|brand|individual) as well as the new
    // ?role=… (adds promoter / guest).
    const t = search.get("type");
    const r = search.get("role");
    const incoming = (r ?? t) as string | null;
    if (
      incoming === "venue" ||
      incoming === "brand" ||
      incoming === "promoter"
    ) {
      setRole(incoming);
      setStep(1);
    } else if (incoming === "individual") {
      // Legacy alias.
      setRole("promoter");
      setStep(1);
    } else if (incoming === "guest") {
      router.replace("/discover");
    }
  }, [router, search, postOwnerHref]);

  // ──────────── STEP HANDLERS ────────────

  function pickRole(r: RoleChoice) {
    setError(null);
    if (r === "guest") {
      router.push("/discover");
      return;
    }
    setRole(r);
    setStep(1);
  }

  function backOne() {
    setError(null);
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  }

  async function onSubmitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setError("Pick a role first.");
    const normalized = normalizePhone(phoneInput);
    if (!normalized) return setError("Enter a valid phone number.");

    setE164Phone(normalized);
    setPending(true);
    const supabase = createClient();
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone: normalized,
    });
    setPending(false);
    if (otpErr) {
      setError(otpErr.message);
      return;
    }
    setStep(2);
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!e164Phone || !role) return setError("Start over.");
    if (code.length < 4) return setError("Enter the code.");

    setPending(true);
    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: code,
      type: "sms",
    });
    setPending(false);
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    setStep(3);
  }

  async function onSubmitWelcome(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role || !e164Phone) return setError("Start over.");
    if (!fullName.trim()) return setError("Enter your name.");

    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("Session lost. Verify your phone again.");
      setStep(2);
      return;
    }

    // 1. Upsert profile. Trigger normally creates the row on auth.users
    // insert, but we upsert here as a safety net for cases where the
    // auth.users row predates the trigger (existing accounts created
    // before the schema was applied) — the upsert fills the gap without
    // breaking the next step (accounts insert FK references this).
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          phone: e164Phone,
          email: user.email ?? null,
          full_name: fullName.trim(),
          role: "owner",
        },
        { onConflict: "id" },
      );
    if (profileErr) {
      setPending(false);
      setError(profileErr.message);
      return;
    }

    // 2. For promoter: create a lightweight account (display_name = full
    // name) so the FK on profiles.account_id resolves, then ship them
    // straight to the dashboard.
    if (role === "promoter") {
      const { data: existing } = await supabase
        .from("accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      const account =
        existing ??
        (
          await supabase
            .from("accounts")
            .insert({
              account_type: "individual" as AccountType,
              display_name: fullName.trim(),
              owner_user_id: user.id,
            })
            .select("id")
            .single()
        ).data;
      if (!account) {
        setPending(false);
        setError("Could not create account. Try again.");
        return;
      }
      await supabase
        .from("profiles")
        .update({ account_id: account.id })
        .eq("id", user.id);
      setPending(false);
      router.replace(postOwnerHref);
      return;
    }

    // 3. venue / brand: account is created at Step 4 (so display_name can
    // reuse the venue name) — just advance.
    setPending(false);
    setStep(4);
  }

  async function onSubmitVenue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role || (role !== "venue" && role !== "brand"))
      return setError("Start over.");
    if (!venueName.trim()) return setError("Enter a venue name.");
    const cap = venueCap.trim() ? parseInt(venueCap.trim(), 10) : null;
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) {
      return setError("Capacity must be a positive number.");
    }

    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("Session lost. Sign in again.");
      router.push("/login");
      return;
    }

    const accountType = roleToAccountType(role);
    if (!accountType) {
      setPending(false);
      setError("Unknown role.");
      return;
    }

    // 1. Create or reuse account, using the venue name as display_name.
    const { data: existing } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    const account =
      existing ??
      (
        await supabase
          .from("accounts")
          .insert({
            account_type: accountType,
            display_name: venueName.trim(),
            owner_user_id: user.id,
          })
          .select("id")
          .single()
      ).data;
    if (!account) {
      setPending(false);
      setError("Could not create account. Try again.");
      return;
    }

    await supabase
      .from("profiles")
      .update({ account_id: account.id })
      .eq("id", user.id);

    // 2. Insert venue row. Per spec this happens for both venue + brand —
    // brands often run their own room or maintain a default location.
    const { error: venueErr } = await supabase.from("venues").insert({
      account_id: account.id,
      name: venueName.trim(),
      city: venueCity.trim() || null,
      timezone: "America/New_York",
      default_capacity: cap,
    });
    setPending(false);
    if (venueErr) {
      setError(venueErr.message);
      return;
    }
    router.replace(postDoneHref);
  }

  async function onSkipVenue() {
    setError(null);
    if (!role || (role !== "venue" && role !== "brand")) return;
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("Session lost. Sign in again.");
      router.push("/login");
      return;
    }
    const accountType = roleToAccountType(role)!;
    // Still need an account row so the dashboard can resolve. Use the
    // user's full name as a placeholder display_name; they can rename in
    // settings later.
    const { data: existing } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    const account =
      existing ??
      (
        await supabase
          .from("accounts")
          .insert({
            account_type: accountType,
            display_name: fullName.trim() || "My account",
            owner_user_id: user.id,
          })
          .select("id")
          .single()
      ).data;
    if (account) {
      await supabase
        .from("profiles")
        .update({ account_id: account.id })
        .eq("id", user.id);
    }
    setPending(false);
    router.replace(postDoneHref);
  }

  async function onResend() {
    if (!e164Phone) return;
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ phone: e164Phone });
  }

  // ──────────── RENDER ────────────

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {step > 0 && (
        <StepHeader step={step} total={VISIBLE_TOTAL} onBack={backOne} />
      )}

      <div
        style={{
          flex: 1,
          padding: "var(--s-8) var(--s-6)",
          display: "flex",
          alignItems: step === 0 ? "center" : "flex-start",
          justifyContent: "center",
        }}
      >
        {step === 0 && <Step0 onPick={pickRole} />}

        {step === 1 && role && (
          <Step1Phone
            phone={phoneInput}
            setPhone={setPhoneInput}
            error={error}
            pending={pending}
            onSubmit={onSubmitPhone}
          />
        )}

        {step === 2 && e164Phone && (
          <Step2Verify
            phone={e164Phone}
            code={code}
            setCode={setCode}
            error={error}
            pending={pending}
            onVerify={onVerify}
            onResend={onResend}
            onChangePhone={() => {
              setError(null);
              setCode("");
              setStep(1);
            }}
          />
        )}

        {step === 3 && role && (
          <Step3Welcome
            role={role}
            fullName={fullName}
            setFullName={setFullName}
            error={error}
            pending={pending}
            onSubmit={onSubmitWelcome}
          />
        )}

        {step === 4 && (role === "venue" || role === "brand") && (
          <Step4Venue
            role={role}
            venueName={venueName}
            setVenueName={setVenueName}
            venueCity={venueCity}
            setVenueCity={setVenueCity}
            venueCap={venueCap}
            setVenueCap={setVenueCap}
            error={error}
            pending={pending}
            onSubmit={onSubmitVenue}
            onSkip={onSkipVenue}
          />
        )}
      </div>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step header — small logo + back arrow + "Step N of 4" chip.
// Step 0 has no header (its layout centers the role grid).
// ────────────────────────────────────────────────────────────────────

function StepHeader({
  step,
  total,
  onBack,
}: {
  step: Step;
  total: number;
  onBack: () => void;
}) {
  return (
    <header
      style={{
        padding: "var(--s-5) var(--s-6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--s-4)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="btn btn--ghost btn--sm"
          style={{ width: 36, padding: 0 }}
        >
          ←
        </button>
        <Logo size={18} />
      </div>
      <span className="chip chip--ghost">
        Step {step} of {total}
      </span>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 0 — V5OnboardEntry. 2×2 role grid, headline + sub copy.
// ────────────────────────────────────────────────────────────────────

function Step0({ onPick }: { onPick: (r: RoleChoice) => void }) {
  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <Logo size={20} />
      <div
        className="t-display-md"
        style={{ marginTop: "var(--s-10)" }}
      >
        What brings you here?
      </div>
      <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
        One question. Pick the closest. You can change later.
      </div>

      <div
        className="signup-role-grid"
        style={{
          marginTop: "var(--s-8)",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--s-3)",
        }}
      >
        {ROLE_CARDS.map((card) => (
          <button
            key={card.choice}
            type="button"
            onClick={() => onPick(card.choice)}
            className="card card--hover"
            style={{
              padding: "var(--s-5)",
              textAlign: "left",
              cursor: "pointer",
              color: "var(--fg)",
              background: "var(--bg-2)",
            }}
          >
            <div className="t-h1">{card.title}</div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              {card.sub}
            </div>
          </button>
        ))}
      </div>

      <div
        className="t-meta"
        style={{
          marginTop: "var(--s-8)",
          textAlign: "center",
          color: "var(--fg-3)",
        }}
      >
        Already on Wadl?{" "}
        <Link href="/login" style={{ color: "var(--fg)" }}>
          Sign in
        </Link>
      </div>

      <style>{`
        @media (max-width: 560px) {
          .signup-role-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 1 — V5OnboardPhone. Single phone field + Continue.
// ────────────────────────────────────────────────────────────────────

function Step1Phone({
  phone,
  setPhone,
  error,
  pending,
  onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 460 }}>
      <div className="t-display-md">Your phone</div>
      <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
        One field. No password. We text a code.
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: "var(--s-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          placeholder="+1 305 799 0518"
          style={{ height: 56, fontSize: 18 }}
          required
          autoFocus
        />

        {error ? <ErrorLine>{error}</ErrorLine> : null}

        <button
          type="submit"
          className="btn btn--xl btn--block"
          disabled={pending}
        >
          {pending ? "Sending code…" : "Continue"}
        </button>

        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-1)",
            textAlign: "center",
            color: "var(--fg-3)",
          }}
        >
          By tapping you agree to{" "}
          <Link href="/legal/terms" style={{ color: "var(--fg-2)" }}>
            terms
          </Link>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 2 — OTP verify. 6-digit code.
// ────────────────────────────────────────────────────────────────────

function Step2Verify({
  phone,
  code,
  setCode,
  error,
  pending,
  onVerify,
  onResend,
  onChangePhone,
}: {
  phone: string;
  code: string;
  setCode: (v: string) => void;
  error: string | null;
  pending: boolean;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  onChangePhone: () => void;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 460 }}>
      <div className="t-display-md">Enter the code</div>
      <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
        Sent to <span style={{ color: "var(--fg)" }}>{phone}</span>.{" "}
        <button
          type="button"
          onClick={onChangePhone}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--fg)",
            cursor: "pointer",
            padding: 0,
            fontSize: "inherit",
            textDecoration: "underline",
          }}
        >
          Change number
        </button>
      </div>

      <form
        onSubmit={onVerify}
        style={{
          marginTop: "var(--s-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="input"
          style={{
            height: 64,
            fontSize: 28,
            textAlign: "center",
            letterSpacing: "0.5em",
            fontFamily: "var(--mono)",
            paddingInlineStart: "0.5em",
          }}
          placeholder="••••••"
          required
          autoFocus
          aria-label="6-digit code"
        />

        {error ? <ErrorLine>{error}</ErrorLine> : null}

        <button
          type="submit"
          className="btn btn--xl btn--block"
          disabled={pending}
        >
          {pending ? "Verifying…" : "Verify & continue"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={onResend}
          disabled={pending}
        >
          Resend code
        </button>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 3 — V5OnboardWelcome. Context-aware welcome copy + name input.
// ────────────────────────────────────────────────────────────────────

function Step3Welcome({
  role,
  fullName,
  setFullName,
  error,
  pending,
  onSubmit,
}: {
  role: RoleChoice;
  fullName: string;
  setFullName: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const copy = WELCOME_COPY[role];
  return (
    <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--r-pill)",
          background: "var(--ok)",
          color: "var(--bg)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        ✓
      </div>
      <div className="t-display-md" style={{ marginTop: "var(--s-6)" }}>
        {copy.title}
      </div>
      <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
        {copy.sub}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: "var(--s-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
          textAlign: "left",
        }}
      >
        <div>
          <label
            htmlFor="fullName"
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-2)" }}
          >
            Your name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Jordy Montero"
            style={{ height: 56, fontSize: 18 }}
            required
            autoFocus
          />
        </div>

        {error ? <ErrorLine>{error}</ErrorLine> : null}

        <button
          type="submit"
          className="btn btn--xl btn--block"
          disabled={pending}
        >
          {pending ? "Saving…" : copy.cta}
        </button>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Step 4 — V5VenueSetup. Single page: name + city + default_capacity.
// ────────────────────────────────────────────────────────────────────

function Step4Venue({
  role,
  venueName,
  setVenueName,
  venueCity,
  setVenueCity,
  venueCap,
  setVenueCap,
  error,
  pending,
  onSubmit,
  onSkip,
}: {
  role: "venue" | "brand";
  venueName: string;
  setVenueName: (v: string) => void;
  venueCity: string;
  setVenueCity: (v: string) => void;
  venueCap: string;
  setVenueCap: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}) {
  const nameLabel = role === "brand" ? "Brand / room name" : "Venue name";
  return (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <div className="t-display-md">Your venue</div>
      <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
        Three fields. Skip cover for now — auto-generated.
      </div>

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
          <div className="t-meta">{nameLabel}</div>
          <input
            id="venueName"
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="input"
            placeholder="BR · BK"
            style={{ marginTop: "var(--s-1)" }}
            required
            autoFocus
          />
        </div>
        <div>
          <div className="t-meta">City</div>
          <input
            id="venueCity"
            type="text"
            value={venueCity}
            onChange={(e) => setVenueCity(e.target.value)}
            className="input"
            placeholder="Brooklyn"
            style={{ marginTop: "var(--s-1)" }}
          />
        </div>
        <div>
          <div className="t-meta">Default capacity</div>
          <input
            id="venueCap"
            type="number"
            inputMode="numeric"
            min={1}
            value={venueCap}
            onChange={(e) => setVenueCap(e.target.value)}
            className="input"
            placeholder="320"
            style={{ marginTop: "var(--s-1)" }}
          />
        </div>

        {error ? <ErrorLine>{error}</ErrorLine> : null}

        <button
          type="submit"
          className="btn btn--xl btn--block"
          style={{ marginTop: "var(--s-3)" }}
          disabled={pending}
        >
          {pending ? "Saving…" : "Open my dashboard"}
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "var(--s-2)",
          }}
        >
          <span className="t-meta" style={{ color: "var(--fg-3)" }}>
            2 of 2
          </span>
          <button
            type="button"
            onClick={onSkip}
            disabled={pending}
            className="t-meta"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 0,
              color: "var(--fg-2)",
              textDecoration: "underline",
            }}
          >
            Skip · I&apos;ll do this later
          </button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-body-2" style={{ color: "var(--err)" }} role="alert">
      {children}
    </p>
  );
}

export default function SignupPage() {
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
      <SignupWizard />
    </Suspense>
  );
}
