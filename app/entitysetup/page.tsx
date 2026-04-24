"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/types";

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

    router.push(account.account_type === "venue" ? "/venuesetup" : "/owner/dashboard");
  }

  const label =
    accountType === "venue"
      ? "Venue name"
      : accountType === "brand"
      ? "Brand name"
      : "Your name or handle";

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">02 / Entity</p>
        <h1 className="display-xl mb-2">Name it.</h1>
        <p className="text-muted text-sm mt-4">
          This is what guests and staff will see on the list.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
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
            placeholder={accountType === "venue" ? "Floyd Miami" : "Mainframe"}
            required
          />
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? "Creating…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

export default function EntitySetupPage() {
  return (
    <Suspense fallback={<main className="mobile-frame" />}>
      <EntitySetupInner />
    </Suspense>
  );
}
