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
    <div
      className="w-app"
      style={{ minHeight: "100vh", background: "var(--w-bg)" }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--w-line)",
          background: "var(--w-surface-1)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <p
            style={{
              fontFamily: "var(--w-display)",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "var(--w-acc)",
              margin: 0,
            }}
          >
            WADL · ADMIN
          </p>
          <Link
            href="/owner"
            className="w-type-meta"
            style={{
              marginLeft: "auto",
              color: "var(--w-fg-muted)",
              textDecoration: "none",
            }}
          >
            ← MY OWNER VIEW
          </Link>
        </div>
        <AdminTabs />
      </header>
      {children}
    </div>
  );
}
