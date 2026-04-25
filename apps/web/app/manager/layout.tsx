import AuthedShell, { type NavSection } from "@/components/authed-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pull a lightweight user snapshot for the sidebar without invoking the
  // full requireDoorContext (which expects an event id).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; phone: string | null; role: string }>();

  const sections: NavSection[] = [
    {
      label: "Run the door",
      items: [
        { href: "/manager", label: "Manager view", matchPrefix: "/manager/events" },
        { href: "/door", label: "Scanner / search" },
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
      user={{ full_name: profile?.full_name ?? null, phone: profile?.phone ?? null }}
      account={null}
      sections={sections}
      brand="WADL"
      brandSub="Manager"
      brandTone="gold"
    >
      {children}
    </AuthedShell>
  );
}
