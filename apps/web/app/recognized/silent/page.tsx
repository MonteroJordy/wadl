import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome back — WADL" };

interface PageProps {
  searchParams: {
    g?: string;
    phone?: string;
    token?: string;
  };
}

function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  const digits = p.replace(/[^\d]/g, "");
  if (digits.length < 6) return p;
  const last4 = digits.slice(-4);
  const cc = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "+1 ";
  return `${cc}··· ${last4}`;
}

export default async function SilentRecognized({ searchParams }: PageProps) {
  const supabase = createAdminClient();
  let name = "";
  let phone = "";
  let pastEventCount = 0;
  let eventName = "";

  if (searchParams.g) {
    const { data: guest } = await supabase
      .from("guests")
      .select("full_name, phone, event_night_id")
      .eq("qr_token", searchParams.g)
      .maybeSingle();
    if (!guest) notFound();
    name = guest.full_name;
    phone = guest.phone ?? "";
    if (phone) {
      const { count } = await supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone);
      pastEventCount = Math.max(0, (count ?? 0) - 1);
    }
    const { data: night } = await supabase
      .from("event_nights")
      .select("event:events ( name )")
      .eq("id", guest.event_night_id)
      .maybeSingle();
    const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;
    eventName = ev?.name ?? "";
  } else if (searchParams.phone) {
    phone = searchParams.phone;
    const { data: guest } = await supabase
      .from("guests")
      .select("full_name")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!guest) notFound();
    name = guest.full_name;
    const { count } = await supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone);
    pastEventCount = count ?? 0;
  } else {
    notFound();
  }

  const backHref = searchParams.token ? `/g/${searchParams.token}` : "/mytickets";

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "var(--s-5)", borderBottom: "1px solid var(--line)" }}>
        <Logo size={20} />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ aspectRatio: "4/5" }}>
            <Cover seed={eventName || "Welcome back"} height={320} />
          </div>
        </div>

        <div>
          <span className="chip chip--info">Welcome back</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-3)", lineHeight: 1.15 }}
          >
            We recognized your phone
          </h1>
          <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
            {pastEventCount > 0
              ? `You've been to ${pastEventCount} event${pastEventCount === 1 ? "" : "s"} before. We linked this RSVP to your record.`
              : "We linked this RSVP to the phone on file."}
          </p>
        </div>

        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div className="t-meta">YOUR INFO</div>
          <div className="t-h2" style={{ marginTop: "var(--s-1)" }}>
            {name}
          </div>
          <div className="t-body-2">{maskPhone(phone)}</div>
        </div>

        <Link
          href={backHref}
          className="btn btn--lg btn--block"
          style={{ textDecoration: "none" }}
        >
          Confirm
        </Link>
        <Link
          href="/signup"
          className="btn btn--ghost btn--block"
          style={{ textDecoration: "none" }}
        >
          Create account to save history
        </Link>
      </div>
    </main>
  );
}
