"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/types";
import { accountEntityLabel } from "@wadl/shared/account-type";

const VALID_TYPES: AccountType[] = ["venue", "brand", "individual"];

function EntitySetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get("type");

  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(
    VALID_TYPES.includes(typeParam as AccountType)
      ? (typeParam as AccountType)
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user already has an account, skip ahead.
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
        .select("account_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.account_id) {
        router.replace("/");
      } else if (!accountType) {
        router.replace("/signup");
      }
    })();
  }, [router, accountType]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError("Enter a name.");
    if (!accountType) return setError("Missing account type.");

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Session expired. Log in again.");
      return;
    }

    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .insert({
        account_type: accountType,
        display_name: displayName.trim(),
        owner_user_id: user.id,
      })
      .select("id, account_type")
      .single();

    if (accErr || !account) {
      setLoading(false);
      setError(accErr?.message ?? "Could not create account.");
      return;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ account_id: account.id })
      .eq("id", user.id);

    setLoading(false);
    if (profileErr) {
      setError(profileErr.message);
      return;
    }

    router.push(account.account_type === "venue" ? "/venuesetup" : "/welcome");
  }

  const entity = accountType ? accountEntityLabel(accountType) : null;
  const label = entity
    ? entity.noun.charAt(0).toUpperCase() + entity.noun.slice(1) + " name"
    : "Name";

  return (
    <main
      id="main-content"
      className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(255,74,43,0.18), transparent 55%)",
        }}
      />
      <div className="w-full max-w-md">
        <p className="label-mono mb-3">02 / Entity</p>
        <h1 className="font-display text-5xl text-cream uppercase tracking-wide leading-[0.95] mb-3">
          Name it.
        </h1>
        <p className="text-muted text-sm mb-10">
          This is what guests and staff will see on the list.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="displayName" className="label-mono block mb-2">
              {label}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-dark"
              placeholder={entity?.placeholder ?? ""}
              required
            />
          </div>

          {error && <p className="text-coral text-sm">{error}</p>}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? "Creating…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function EntitySetupPage() {
  return (
    <Suspense fallback={<main id="main-content" className="mobile-frame" />}>
      <EntitySetupInner />
    </Suspense>
  );
}
