import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import WelcomeWizard from "./wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome — WADL" };

export default async function WelcomePage() {
  const { supabase, profile, account } = await requireOwnerContext();
  if (profile.onboarding_completed_at) redirect("/owner");

  const { count: venueCount } = await supabase
    .from("venues")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id);

  return (
    <WelcomeWizard
      initial={{
        fullName: profile.full_name ?? "",
        accountType: account.account_type,
        accountName: account.display_name,
        hasVenue: (venueCount ?? 0) > 0,
      }}
    />
  );
}
