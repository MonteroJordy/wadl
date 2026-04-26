import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Account, Profile } from "@/lib/types";

export { fmtDate, fmtTime } from "@/lib/format";

/**
 * Standard server-side guard for /owner/* pages. Returns the signed-in
 * profile + account when the user is the actual account owner, or redirects
 * to the appropriate onboarding step if they're not ready.
 *
 * Defense-in-depth checks (Day 19 P1-2):
 *   1. Authenticated user with a profile.
 *   2. profile.full_name set (signup complete).
 *   3. profile.account_id set (entitysetup complete).
 *   4. account_id resolves to an actual account row.
 *   5. account.owner_user_id === user.id  (THIS user is the owner, not a
 *      future co-account-member who happens to share the account_id).
 *   6. profile.role === 'owner' OR the account row trusts them as owner.
 *      We accept either since legacy profiles created via OTP default to
 *      'guest' before signup completes.
 *
 * If checks 5/6 fail with a real account that isn't theirs, we redirect to
 * /  (root will route them to /mytickets if they're a guest, /holder if
 * they're a holder, etc.).
 */
export async function requireOwnerContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.full_name) redirect("/signup");
  if (!profile.account_id) redirect("/entitysetup");

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", profile.account_id)
    .maybeSingle<Account>();

  if (!account) redirect("/entitysetup");

  // The account row must point back to this user — otherwise the user is
  // (in theory) a future co-account-member trying to reach owner surfaces
  // through their account_id, which they shouldn't.
  if (account.owner_user_id !== user.id) redirect("/");

  // Role check: door staff/managers shouldn't see /owner/* even if they
  // somehow have an account_id. 'owner' / 'guest' both pass — 'guest' is
  // the default for OTP-created profiles before signup flips them; the
  // earlier full_name + account_id checks already filter half-onboarded
  // users.
  if (profile.role === "manager" || profile.role === "staff" ||
      profile.role === "door_manager" || profile.role === "door_staff") {
    redirect("/");
  }

  return { supabase, user, profile, account };
}
