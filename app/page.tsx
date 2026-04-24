import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nextOnboardingStep } from "@/lib/routing";
import type { Account, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RootPage() {
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

  let account: Account | null = null;
  if (profile?.account_id) {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", profile.account_id)
      .maybeSingle<Account>();
    account = data;
  }

  let hasVenue = false;
  if (account?.account_type === "venue") {
    const { count } = await supabase
      .from("venues")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id);
    hasVenue = (count ?? 0) > 0;
  }

  redirect(nextOnboardingStep(profile, account, hasVenue));
}
