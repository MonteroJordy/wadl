import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Account, Profile } from "@/lib/types";

/**
 * Standard server-side guard for /owner/* pages. Returns the signed-in
 * profile + account, or redirects to the appropriate onboarding step if
 * the user isn't ready.
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

  return { supabase, user, profile, account };
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    .toLowerCase();
}
