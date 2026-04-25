import AuthedShell, { type NavSection } from "@/components/authed-shell";
import { requireOwnerContext } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, account } = await requireOwnerContext();

  const sections: NavSection[] = [
    {
      label: "Run the door",
      items: [
        { href: "/owner", label: "This week", matchPrefix: "/owner/events" },
        { href: "/owner/events/new", label: "+ New event" },
        { href: "/owner/scorecards", label: "Scorecards" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/owner/profile", label: "Profile + venues" },
        { href: "/owner/sms-templates", label: "SMS templates" },
        { href: "/owner/billing", label: "Billing" },
      ],
    },
    {
      label: "View as",
      items: [
        { href: "/discover", label: "Guest discovery" },
        { href: "/mytickets", label: "My tickets" },
      ],
    },
  ];

  return (
    <AuthedShell
      user={{ full_name: profile.full_name, phone: profile.phone }}
      account={{
        display_name: account.display_name,
        account_type: account.account_type,
      }}
      sections={sections}
      brand="WADL"
      brandSub={account.display_name}
      brandTone="coral"
    >
      {children}
    </AuthedShell>
  );
}
