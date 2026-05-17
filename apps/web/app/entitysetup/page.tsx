"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/types";
import { accountEntityLabel } from "@wadl/shared/account-type";
import { Logo } from "@/components/v5";

const VALID_TYPES: AccountType[] = ["venue", "brand", "individual"];

function EntitySetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get("type");

  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(
    VALID_TYPES.includes(typeParam as AccountType)
      ? (typeParam as AccountType)
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    ? entity.noun.charAt(0).toUpperCase() +
      entity.noun.slice(1) +
      " name"
    : "Name";

  return (
    <main id="main-content">
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          maxWidth: 960,
          marginInline: "auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 48,
        }}
      >
        <div style={{ padding: "20px 24px 0" }}>
          <Logo size={20} />
        </div>

        <div style={{ padding: "56px 24px 0" }}>
          <div className="w-type-meta">02 / ENTITY</div>
          <div
            className="w-type-display-lg"
            style={{ marginTop: 12, lineHeight: 0.94 }}
          >
            Name
            <br />
            it.
          </div>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 320,
            }}
          >
            This is what guests and staff will see on the list.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            padding: "32px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label htmlFor="displayName" className="w-label">
              {label.toUpperCase()}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-input"
              style={{ height: 56, fontSize: 16 }}
              placeholder={entity?.placeholder ?? ""}
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

          <button
            type="submit"
            className="btn btn--lg btn--block"
            disabled={loading}
          >
            {loading ? "Creating…" : "Continue →"}
          </button>
        </form>

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 32,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          STEP 02 · 03
        </div>
      </div>
    </main>
  );
}

export default function EntitySetupPage() {
  return (
    <Suspense fallback={<main id="main-content" className="w-app w-frame" />}>
      <EntitySetupInner />
    </Suspense>
  );
}
