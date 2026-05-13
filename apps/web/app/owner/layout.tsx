import AuthedShell, { type NavSection } from "@/components/authed-shell";
import { requireOwnerContext } from "@/lib/owner";
import CommandPalette from "@/components/command-palette";
import NotificationBell from "@/components/notification-bell";
import MobileTabBar from "@/components/mobile-tab-bar";
import ShortcutHelp from "@/components/shortcut-help";
import { hiddenNavHrefs } from "@wadl/shared/account-type";

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
      // Anchor section: everything an operator touches on event day.
      label: "Events",
      items: [
        { href: "/owner", label: "This week", matchPrefix: "/owner/events" },
        { href: "/owner/calendar", label: "Calendar" },
        { href: "/owner/events/new", label: "+ New event" },
      ],
    },
    {
      // People + analytics — second-tier daily use.
      label: "People",
      items: [
        { href: "/owner/holders", label: "Promoters" },
        ...(account.account_type !== "venue"
          ? [{ href: "/owner/partners", label: "Venues you collab with" }]
          : []),
        { href: "/owner/scorecards", label: "Promoter ranks" },
        { href: "/owner/analytics", label: "Analytics" },
        { href: "/owner/flags", label: "Do not admit" },
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
      // Role-switch shortcuts so an operator can preview what their team
      // / guests see without signing out.
      label: "Preview as",
      items: [
        { href: "/door", label: "Door staff" },
        { href: "/manager", label: "Floor manager" },
        { href: "/discover", label: "Public event feed" },
        { href: "/mytickets", label: "Guest wallet" },
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

  // Day 41: hide nav items irrelevant to this account type. Brands skip
  // webhooks; individuals skip both webhooks + sms_templates.
  const hidden = hiddenNavHrefs(account.account_type);
  const filteredSections: NavSection[] = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((it) => !hidden.has(it.href)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <AuthedShell
      user={{ full_name: profile.full_name, phone: profile.phone }}
      account={{
        display_name: account.display_name,
        account_type: account.account_type,
      }}
      sections={filteredSections}
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
      <MobileTabBar unread={unread ?? 0} />
      <ShortcutHelp />
    </AuthedShell>
  );
}
