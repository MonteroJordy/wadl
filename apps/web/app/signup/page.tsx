"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/routing";
import type { AccountType } from "@/lib/types";
import {
  Button,
  Chip,
  IconArrow,
  IconBack,
  Wordmark,
} from "@/components/wadl";

// ════════════════════════════════════════════════════════════════════
// Single-page onboarding wizard. Replaces the old chain
// /signup → /entitysetup → /venuesetup → /welcome (5 redirects to start
// running an event). Auth happens IN the wizard, at the OTP step. New
// users never have to "already be signed in" before they can fill in
// their profile.
//
// Steps:
//  0  Role          — venue / brand / individual / guest-only
//  1  Identity      — your name, org name, phone
//  2  Verify        — 6-digit OTP
//  3  Venue extras  — only for account_type === "venue"
//  4  Done          — bounce to /owner
// ════════════════════════════════════════════════════════════════════

type Step = 0 | 1 | 2 | 3;

const ROLES: {
  id: AccountType;
  label: string;
  blurb: string;
  orgLabel: string;
  orgPlaceholder: string;
}[] = [
  {
    id: "venue",
    label: "Venue",
    blurb: "Club, bar, rooftop — runs events on your floor",
    orgLabel: "Venue name",
    orgPlaceholder: "Floyd Miami",
  },
  {
    id: "brand",
    label: "Brand / Promoter",
    blurb: "Label, agency, series — books rooms and brings the show",
    orgLabel: "Brand name",
    orgPlaceholder: "House Brand",
  },
  {
    id: "individual",
    label: "Artist / Individual",
    blurb: "DJ, host, anyone running a list under your own name",
    orgLabel: "Stage name (optional)",
    orgPlaceholder: "Maya Wells",
  },
];

function SignupWizard() {
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<Step>(0);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [e164Phone, setE164Phone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [venueAddr, setVenueAddr] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueCap, setVenueCap] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Resume mid-flow: if user is already authenticated but onboarding is
  // incomplete (no full_name or no account_id), drop them at the right
  // step instead of starting over.
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
        // Already onboarded. If venue + no venue row, go to step 3,
        // otherwise straight to dashboard.
        if (profile.accounts?.account_type === "venue") {
          const { count } = await supabase
            .from("venues")
            .select("id", { count: "exact", head: true })
            .eq("account_id", profile.account_id);
          if ((count ?? 0) === 0) {
            setAccountType("venue");
            setFullName(profile.full_name);
            setStep(3);
            return;
          }
        }
        router.replace("/owner");
        return;
      }
      if (profile?.full_name) setFullName(profile.full_name);
    })();
    // Pre-select role from query string if landing from a CTA.
    const t = search.get("type");
    if (t === "venue" || t === "brand" || t === "individual") {
      setAccountType(t);
      setStep(1);
    }
  }, [router, search]);

  // ──────────── STEP HANDLERS ────────────

  function pickRole(t: AccountType) {
    setAccountType(t);
    setError(null);
    setStep(1);
  }

  async function onSubmitIdentity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountType) return setError("Pick a role first.");
    if (!fullName.trim()) return setError("Enter your name.");
    if (accountType !== "individual" && !orgName.trim())
      return setError("Enter your organization name.");
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
    if (!e164Phone || !accountType) return setError("Start over.");
    if (code.length < 4) return setError("Enter the code.");

    setPending(true);
    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: code,
      type: "sms",
    });
    if (verifyErr) {
      setPending(false);
      setError(verifyErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("Verification succeeded but session is missing. Try again.");
      return;
    }

    // 1. Update profile.
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        role: accountType === "individual" ? "owner" : "owner",
      })
      .eq("id", user.id);
    if (profileErr) {
      setPending(false);
      setError(profileErr.message);
      return;
    }

    // 2. Create or upsert account.
    const display =
      accountType === "individual" && !orgName.trim()
        ? fullName.trim()
        : orgName.trim();
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
            display_name: display,
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
    if (accountType === "venue") {
      setStep(3);
    } else {
      router.replace("/owner");
    }
  }

  async function onSubmitVenue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("id", user.id)
      .maybeSingle<{ account_id: string | null }>();

    if (!profile?.account_id) {
      setPending(false);
      setError("Account missing. Restart.");
      return;
    }

    const cap = venueCap.trim() ? parseInt(venueCap.trim(), 10) : null;
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) {
      setPending(false);
      setError("Capacity must be a positive number.");
      return;
    }

    const { error: venueErr } = await supabase.from("venues").insert({
      account_id: profile.account_id,
      name: orgName.trim(),
      address: venueAddr.trim() || null,
      city: venueCity.trim() || null,
      timezone: "America/New_York",
      default_capacity: cap,
    });

    setPending(false);
    if (venueErr) {
      setError(venueErr.message);
      return;
    }
    router.replace("/owner");
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header step={step} onBack={() => setStep(Math.max(0, step - 1) as Step)} />

      <div style={{ flex: 1, padding: "24px" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {step === 0 && (
            <Step0
              onPick={pickRole}
              onAttendOnly={() => router.push("/discover")}
            />
          )}
          {step === 1 && accountType && (
            <Step1Identity
              accountType={accountType}
              fullName={fullName}
              setFullName={setFullName}
              orgName={orgName}
              setOrgName={setOrgName}
              phone={phoneInput}
              setPhone={setPhoneInput}
              error={error}
              pending={pending}
              onSubmit={onSubmitIdentity}
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
              onChangePhone={() => setStep(1)}
            />
          )}
          {step === 3 && accountType === "venue" && (
            <Step3Venue
              orgName={orgName}
              venueAddr={venueAddr}
              setVenueAddr={setVenueAddr}
              venueCity={venueCity}
              setVenueCity={setVenueCity}
              venueCap={venueCap}
              setVenueCap={setVenueCap}
              error={error}
              pending={pending}
              onSubmit={onSubmitVenue}
              onSkip={() => router.replace("/owner")}
            />
          )}
        </div>
      </div>

      <footer
        style={{
          padding: "20px 24px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="w-type-meta"
          style={{ color: "var(--w-fg-dim)" }}
        >
          ALREADY HAVE AN ACCOUNT?{" "}
          <Link
            href="/login"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            SIGN IN
          </Link>
        </span>
      </footer>
    </main>
  );
}

function Header({ step, onBack }: { step: Step; onBack: () => void }) {
  const labels = ["ROLE", "IDENTITY", "VERIFY", "VENUE"];
  return (
    <header
      style={{
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--w-line)",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {step > 0 ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--w-fg-muted)",
              cursor: "pointer",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBack size={20} />
          </button>
        ) : null}
        <Wordmark variant="monogrid" size={18} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "var(--w-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          flexWrap: "wrap",
        }}
      >
        {labels.map((l, i) => (
          <span
            key={l}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: i <= step ? "var(--w-acc)" : "var(--w-fg-dim)",
            }}
          >
            <span style={{ fontWeight: 600 }}>0{i + 1}</span>
            <span>{l}</span>
            {i < labels.length - 1 && (
              <span
                style={{
                  width: 16,
                  height: 1,
                  background: "var(--w-line-2)",
                }}
              />
            )}
          </span>
        ))}
      </div>
      <Link
        href="/"
        className="w-type-meta"
        style={{ textDecoration: "none" }}
      >
        EXIT
      </Link>
    </header>
  );
}

function Step0({
  onPick,
  onAttendOnly,
}: {
  onPick: (t: AccountType) => void;
  onAttendOnly: () => void;
}) {
  return (
    <div>
      <div className="w-type-meta">01 / ROLE</div>
      <div
        className="w-type-display-lg"
        style={{ marginTop: 12, lineHeight: 0.94 }}
      >
        Who are you?
      </div>
      <p
        className="w-type-body"
        style={{ color: "var(--w-fg-muted)", marginTop: 16 }}
      >
        Pick the one that fits. You can always switch contexts later — same
        login, different hat.
      </p>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 18,
              background: "transparent",
              border: "1px solid var(--w-line-2)",
              color: "var(--w-fg)",
              textAlign: "left",
              cursor: "pointer",
              transition: "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--w-acc-soft)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--w-acc)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "transparent";
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--w-line-2)";
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 17,
                }}
              >
                {r.label}
              </div>
              <div
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 4,
                }}
              >
                {r.blurb}
              </div>
            </div>
            <IconArrow />
          </button>
        ))}

        <hr className="w-rule" style={{ margin: "12px 0" }} />

        <button
          type="button"
          onClick={onAttendOnly}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 14,
            background: "transparent",
            border: 0,
            color: "var(--w-fg-muted)",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div style={{ flex: 1 }}>
            <div className="w-type-meta">JUST HERE TO RSVP TO AN EVENT?</div>
            <div
              className="w-type-body-sm"
              style={{ marginTop: 2 }}
            >
              No account needed. Browse events →
            </div>
          </div>
          <IconArrow />
        </button>
      </div>
    </div>
  );
}

function Step1Identity({
  accountType,
  fullName,
  setFullName,
  orgName,
  setOrgName,
  phone,
  setPhone,
  error,
  pending,
  onSubmit,
}: {
  accountType: AccountType;
  fullName: string;
  setFullName: (v: string) => void;
  orgName: string;
  setOrgName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const role = ROLES.find((r) => r.id === accountType)!;
  return (
    <div>
      <div className="w-type-meta">
        02 / IDENTITY · {role.label.toUpperCase()}
      </div>
      <div
        className="w-type-display-lg"
        style={{ marginTop: 12, lineHeight: 0.94 }}
      >
        Tell us
        <br />
        about you.
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <label htmlFor="fullName" className="w-label">
            YOUR NAME
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-input"
            placeholder="Jordy Montero"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="orgName" className="w-label">
            {role.orgLabel.toUpperCase()}
          </label>
          <input
            id="orgName"
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-input"
            placeholder={role.orgPlaceholder}
            required={accountType !== "individual"}
          />
        </div>

        <div>
          <label htmlFor="phone" className="w-label">
            PHONE
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-input"
            placeholder="(305) 555 1234"
            required
          />
          <p
            className="w-type-meta"
            style={{ marginTop: 8 }}
          >
            WE&apos;LL TEXT YOU A 6-DIGIT CODE · NEVER SHARED · NEVER SPAMMED
          </p>
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
          disabled={pending}
        >
          {pending ? "Sending code…" : "Send code → "}
        </Button>
      </form>
    </div>
  );
}

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
    <div>
      <div className="w-type-meta">03 / VERIFY</div>
      <div
        className="w-type-display-lg"
        style={{ marginTop: 12, lineHeight: 0.94 }}
      >
        Enter
        <br />
        the code.
      </div>
      <p
        className="w-type-body"
        style={{ color: "var(--w-fg-muted)", marginTop: 16 }}
      >
        Sent to <span style={{ color: "var(--w-fg)" }}>{phone}</span>.{" "}
        <button
          type="button"
          onClick={onChangePhone}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--w-acc)",
            cursor: "pointer",
            padding: 0,
            textTransform: "none",
            fontFamily: "var(--w-sans)",
            fontSize: 15,
            letterSpacing: "-0.005em",
            textDecoration: "underline",
          }}
        >
          Change number
        </button>
      </p>

      <form
        onSubmit={onVerify}
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <label htmlFor="code" className="w-label">
            6-DIGIT CODE
          </label>
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
            className="w-input"
            style={{
              height: 64,
              fontSize: 28,
              textAlign: "center",
              letterSpacing: "0.5em",
              fontFamily: "var(--w-mono)",
              paddingInlineStart: "0.5em",
            }}
            placeholder="••••••"
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
          disabled={pending}
        >
          {pending ? "Verifying…" : "Verify & continue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          block
          onClick={onResend}
          disabled={pending}
        >
          Resend code
        </Button>
      </form>
    </div>
  );
}

function Step3Venue({
  orgName,
  venueAddr,
  setVenueAddr,
  venueCity,
  setVenueCity,
  venueCap,
  setVenueCap,
  error,
  pending,
  onSubmit,
  onSkip,
}: {
  orgName: string;
  venueAddr: string;
  setVenueAddr: (v: string) => void;
  venueCity: string;
  setVenueCity: (v: string) => void;
  venueCap: string;
  setVenueCap: (v: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <div className="w-type-meta">04 / VENUE</div>
      <div
        className="w-type-display-lg"
        style={{ marginTop: 12, lineHeight: 0.94 }}
      >
        Your room.
      </div>
      <p
        className="w-type-body"
        style={{ color: "var(--w-fg-muted)", marginTop: 16 }}
      >
        Basics for <span style={{ color: "var(--w-fg)" }}>{orgName}</span>.
        Skip and add later if you&apos;re in a hurry.
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <label htmlFor="addr" className="w-label">
            ADDRESS
          </label>
          <input
            id="addr"
            type="text"
            value={venueAddr}
            onChange={(e) => setVenueAddr(e.target.value)}
            className="w-input"
            placeholder="34 NE 11th St"
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label htmlFor="city" className="w-label">
              CITY
            </label>
            <input
              id="city"
              type="text"
              value={venueCity}
              onChange={(e) => setVenueCity(e.target.value)}
              className="w-input"
              placeholder="Miami"
            />
          </div>
          <div>
            <label htmlFor="cap" className="w-label">
              CAPACITY
            </label>
            <input
              id="cap"
              type="number"
              inputMode="numeric"
              min={1}
              value={venueCap}
              onChange={(e) => setVenueCap(e.target.value)}
              className="w-input"
              placeholder="400"
            />
          </div>
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
          disabled={pending}
        >
          {pending ? "Saving…" : "Finish — open dashboard →"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          block
          onClick={onSkip}
          disabled={pending}
        >
          Skip — I&apos;ll add this later
        </Button>

        <Chip tone="ghost" style={{ alignSelf: "center", marginTop: 8 }}>
          ✓ ROLE   ✓ IDENTITY   ✓ VERIFY   · VENUE
        </Chip>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={<main id="main-content" className="w-app w-frame" />}
    >
      <SignupWizard />
    </Suspense>
  );
}
