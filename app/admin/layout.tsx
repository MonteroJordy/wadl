import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle<{ email: string | null }>();

  if (!profile || profile.email !== PLATFORM_OWNER_EMAIL) {
    redirect("/owner");
  }

  return (
    <div>
      <header className="border-b border-coral/30 bg-s1 px-4 md:px-8 py-3 flex items-center gap-4 sticky top-0 z-30">
        <p className="font-display text-xl text-coral tracking-wide">WADL · ADMIN</p>
        <nav className="flex gap-3">
          <Link href="/admin" className="label-mono hover:text-cream">
            Stats
          </Link>
          <Link href="/admin/accounts" className="label-mono hover:text-cream">
            Accounts
          </Link>
          <Link href="/admin/events" className="label-mono hover:text-cream">
            Events
          </Link>
          <Link href="/admin/guests" className="label-mono hover:text-cream">
            Guests
          </Link>
        </nav>
        <Link href="/owner" className="ml-auto label-mono hover:text-cream">
          ← My owner view
        </Link>
      </header>
      {children}
    </div>
  );
}
