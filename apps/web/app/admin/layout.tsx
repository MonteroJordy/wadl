import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminTabs from "@/components/admin-tabs";

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
      <header className="border-b border-coral/30 bg-s1 sticky top-0 z-30">
        <div className="px-4 md:px-8 py-3 flex items-center gap-4">
          <p className="font-display text-xl text-coral tracking-wide">
            WADL · ADMIN
          </p>
          <Link
            href="/owner"
            className="ml-auto label-mono hover:text-cream"
          >
            ← My owner view
          </Link>
        </div>
        <AdminTabs />
      </header>
      {children}
    </div>
  );
}
