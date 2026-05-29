import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick a context — WADL" };

interface Context {
  href: string;
  name: string;
  role: string;
  sub: string;
}

export default async function RolePickerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/role-picker");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, account_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const contexts: Context[] = [];

  if (profile?.account_id) {
    const { data: acc } = await admin
      .from("accounts")
      .select("name, account_type, city")
      .eq("id", profile.account_id)
      .maybeSingle();
    const { count: liveEvents } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", profile.account_id);
    contexts.push({
      href: "/owner",
      name: acc?.name ?? "Your venue",
      role: profile.role === "owner" ? "Owner" : (profile.role ?? "Member"),
      sub: `${acc?.city ?? ""}${liveEvents ? ` · ${liveEvents} event${liveEvents === 1 ? "" : "s"}` : ""}`.trim() || "Dashboard",
    });
  }

  // Guest context: do they have any guests rows by phone or email?
  const userPhone = (user.phone ?? "").trim();
  const userEmail = (user.email ?? "").trim();
  if (userPhone || userEmail) {
    let guestQuery = admin.from("guests").select("id", { count: "exact", head: true });
    if (userPhone && userEmail) {
      guestQuery = guestQuery.or(`phone.eq.${userPhone},email.eq.${userEmail}`);
    } else if (userPhone) {
      guestQuery = guestQuery.eq("phone", userPhone);
    } else {
      guestQuery = guestQuery.eq("email", userEmail);
    }
    const { count: guestRows } = await guestQuery;
    if ((guestRows ?? 0) > 0) {
      contexts.push({
        href: "/mytickets",
        name: "Personal",
        role: "Guest",
        sub: `${guestRows} RSVP${guestRows === 1 ? "" : "s"}`,
      });
    }
  }

  // If there's only one context, bounce straight there.
  if (contexts.length === 1) redirect(contexts[0].href);
  if (contexts.length === 0) redirect("/signup?next=/role-picker");

  const display = profile?.full_name ?? user.email ?? user.phone ?? "back";

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <Logo size={20} />
        <h1
          className="t-display-md"
          style={{ marginTop: "var(--s-10)", lineHeight: 1.1 }}
        >
          Welcome back, {display.split(" ")[0]}
        </h1>
        <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
          You have {contexts.length} contexts. Pick one.
        </p>
        <div
          style={{
            marginTop: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          {contexts.map((c, idx) => (
            <Link
              key={c.href}
              href={c.href}
              className="card card--hover"
              style={{
                padding: "var(--s-5)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
                background: idx === 0 ? "var(--accent-soft)" : undefined,
                borderColor:
                  idx === 0 ? "rgba(255,61,110,0.35)" : "var(--line)",
              }}
            >
              <div>
                <div className="t-h1">{c.name}</div>
                <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                  {c.role} · {c.sub}
                </div>
              </div>
              <span
                style={{
                  color: idx === 0 ? "var(--accent-1)" : "var(--fg-3)",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
