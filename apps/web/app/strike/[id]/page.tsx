import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";
import { fmtDate } from "@/lib/format";
import AppealForm from "./appeal-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Strike + appeal — WADL" };

interface PageProps {
  params: { id: string };
}

export default async function StrikePage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/strike/${params.id}`);

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, status, event_night_id, event_night:event_nights ( night_date, event:events ( id, name ) )",
    )
    .eq("id", params.id)
    .eq("status", "no_show")
    .maybeSingle();
  if (!guest) notFound();

  // Guard: the signed-in user must match the guest row by phone or email.
  const userPhone = (user.phone ?? "").trim();
  const userEmail = (user.email ?? "").trim();
  const matchesPhone = userPhone && guest.phone === userPhone;
  const matchesEmail = userEmail && guest.email === userEmail;
  if (!matchesPhone && !matchesEmail) notFound();

  const night = Array.isArray(guest.event_night)
    ? guest.event_night[0]
    : guest.event_night;
  const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;

  // Count prior strikes within 60 days.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  let phoneMatchClause = "";
  if (userPhone) phoneMatchClause = `phone.eq.${userPhone}`;
  if (userEmail) {
    phoneMatchClause = phoneMatchClause
      ? `${phoneMatchClause},email.eq.${userEmail}`
      : `email.eq.${userEmail}`;
  }
  const { count: priorStrikes } = await admin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("status", "no_show")
    .or(phoneMatchClause)
    .gte("created_at", sixtyDaysAgo.toISOString());

  const strikeNum = priorStrikes ?? 1;
  const ordinal = strikeNum === 1 ? "First" : strikeNum === 2 ? "Second" : "Third";

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
      <header style={{ padding: "var(--s-5)" }}>
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
        <div>
          <span className="chip chip--warn">No-show recorded</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-4)", lineHeight: 1.15 }}
          >
            You didn&apos;t scan in
            {night ? ` on ${fmtDate(night.night_date)}` : " last night"}.
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            {ev?.name ?? "Event"}
            {night ? ` · ${fmtDate(night.night_date)}.` : "."} {ordinal}{" "}
            strike with this venue.{" "}
            {strikeNum >= 3
              ? "Third strike triggers a 60-day cool-off."
              : "Three in 60 days = decline."}
          </p>
        </div>

        <AppealForm guestId={guest.id} />

        <p
          className="t-meta"
          style={{
            color: "var(--fg-3)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Appeals review within 48h · honest answers help the venue staff.
        </p>
      </div>
    </main>
  );
}
