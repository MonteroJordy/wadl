import AuthedShell, { type NavSection } from "@/components/authed-shell";
import { requireOwnerContext } from "@/lib/owner";
import CommandPalette from "@/components/command-palette";
import NotificationBell from "@/components/notification-bell";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile, account } = await requireOwnerContext();

  // Unread notification count for sidebar badge.
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .is("read_at", null);

  // Whether to surface the platform-admin link.
  const isPlatformAdmin = profile.email === "jmontero@mainframeagency.com";

  const sections: NavSection[] = [
    {
      label: "Run the door",
      items: [
        { href: "/owner", label: "This week", matchPrefix: "/owner/events" },
        { href: "/owner/calendar", label: "Calendar" },
        { href: "/owner/events/new", label: "+ New event" },
        { href: "/owner/holders", label: "Holders" },
        { href: "/owner/scorecards", label: "Scorecards" },
        { href: "/owner/analytics", label: "Analytics" },
        { href: "/owner/flags", label: "Flag list" },
      ],
    },
    {
      label: "Inbox",
      items: [
        {
          href: "/owner/notifications",
          label: "Notifications",
          badge: unread ?? 0,
        },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/owner/profile", label: "Profile + venues" },
        { href: "/owner/sms-templates", label: "SMS templates" },
        { href: "/owner/sms-log", label: "SMS log" },
        { href: "/owner/webhooks", label: "Webhooks" },
        { href: "/owner/payouts", label: "Payouts" },
        { href: "/owner/billing", label: "Billing" },
      ],
    },
    {
      label: "View as",
      items: [
        { href: "/door", label: "Door view" },
        { href: "/manager", label: "Manager view" },
        { href: "/discover", label: "Guest discovery" },
        { href: "/mytickets", label: "My tickets" },
      ],
    },
    ...(isPlatformAdmin
      ? [
          {
            label: "Platform",
            items: [
              { href: "/admin", label: "Internal CMS" },
              { href: "/owner/errors", label: "Error log" },
            ],
          },
        ]
      : []),
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
      topBarRight={
        <>
          <CommandPalette />
          <NotificationBell unread={unread ?? 0} accountId={account.id} />
        </>
      }
    >
      {children}
    </AuthedShell>
  );
}
