import { requireOwnerContext } from "@/lib/owner";
import V5Shell, { type V5NavItem } from "@/components/v5/shell";
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

  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .is("read_at", null);

  const isPlatformAdmin = profile.email === "jmontero@mainframeagency.com";
  const hidden = hiddenNavHrefs(account.account_type);

  // v5 web nav — a minimal 4-item horizontal top nav (the TopNav pattern
  // from Wadl v5.html). Everything else lives in the account menu + ⌘K.
  const nav: V5NavItem[] = [
    { href: "/owner", label: "Events", matchPrefix: "/owner/events" },
    { href: "/owner/calendar", label: "Calendar" },
    { href: "/owner/holders", label: "Promoters" },
    { href: "/owner/analytics", label: "Analytics" },
  ];

  // Everything not in the primary nav — reachable from the avatar
  // dropdown. Filtered by account type, then admin/platform appended.
  const accountMenu = [
    { href: "/owner/profile", label: "Profile + venues" },
    { href: "/owner/notifications", label: `Notifications${unread ? ` (${unread})` : ""}` },
    { href: "/owner/scorecards", label: "Promoter ranks" },
    { href: "/owner/flags", label: "Do not admit" },
    ...(account.account_type !== "venue"
      ? [{ href: "/owner/partners", label: "Venues you collab with" }]
      : []),
    { href: "/owner/sms-templates", label: "SMS templates" },
    { href: "/owner/sms-log", label: "SMS log" },
    { href: "/owner/webhooks", label: "Webhooks" },
    { href: "/owner/payouts", label: "Payouts" },
    { href: "/owner/billing", label: "Billing" },
    { href: "/door", label: "Preview · Door staff" },
    { href: "/manager", label: "Preview · Floor manager" },
    { href: "/discover", label: "Preview · Public feed" },
    { href: "/mytickets", label: "Preview · Guest wallet" },
    ...(isPlatformAdmin
      ? [
          { href: "/admin", label: "Internal CMS" },
          { href: "/owner/errors", label: "Error log" },
        ]
      : []),
    { href: "__signout__", label: "Sign out", danger: true },
  ].filter((m) => !hidden.has(m.href));

  const initials =
    (profile.full_name ?? "")
      .split(" ")
      .map((s) => s[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "WA";

  const accountTypeLabel =
    account.account_type === "venue"
      ? "Owner"
      : account.account_type === "brand"
        ? "Brand"
        : "Host";

  return (
    <V5Shell
      nav={nav}
      context={`${account.display_name} · ${accountTypeLabel}`}
      initials={initials}
      accountMenu={accountMenu}
      unread={unread ?? 0}
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
    </V5Shell>
  );
}
