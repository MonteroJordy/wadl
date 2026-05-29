import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminTabs from "@/components/admin-tabs";
import { Logo } from "@/components/v5";

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
    <div className="v5" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            padding: "var(--s-3) var(--s-6)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
            }}
          >
            <Logo size={18} />
            <span
              className="t-meta"
              style={{
                paddingLeft: "var(--s-2)",
                marginLeft: "var(--s-2)",
                borderLeft: "1px solid var(--line)",
              }}
            >
              Admin
            </span>
          </div>
          <Link
            href="/owner"
            className="t-meta"
            style={{
              marginLeft: "auto",
              color: "var(--fg-3)",
              textDecoration: "none",
            }}
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
