import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Account, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
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

  if (!profile?.account_id) redirect("/entitysetup");

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", profile.account_id)
    .maybeSingle<Account>();

  return (
    <main className="mobile-frame">
      <div className="pt-8">
        <p className="label-mono mb-3">Dashboard</p>
        <h1 className="display-xl mb-2">Welcome,<br/>{profile.full_name?.split(" ")[0] ?? "owner"}.</h1>
        <p className="text-muted text-sm mt-4">
          {account?.display_name} · {account?.account_type}
        </p>
      </div>

      <div className="mt-12 card">
        <p className="label-mono mb-2">Day 1 complete</p>
        <p className="text-cream text-sm leading-relaxed">
          Auth, onboarding, and venue setup are wired. Day 2 brings the week
          view, day dashboard, and multi-night event creation.
        </p>
      </div>

      <form action="/api/auth/signout" method="post" className="mt-auto pt-8">
        <button type="submit" className="btn-ghost">Sign out</button>
      </form>
    </main>
  );
}
