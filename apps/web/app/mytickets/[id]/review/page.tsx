import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, Logo } from "@/components/v5";
import ReviewButtons from "./review-buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "How was it? — WADL" };

interface PageProps {
  params: { id: string };
}

export default async function GuestReviewPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mytickets/${params.id}/review`);

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, event_night_id, event_night:event_nights ( night_date, event:events ( id, name, venue:venues ( name, city ) ) )",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!guest) notFound();

  const night = Array.isArray(guest.event_night)
    ? guest.event_night[0]
    : guest.event_night;
  const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;
  const venue = Array.isArray(ev?.venue) ? ev?.venue[0] : ev?.venue;

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
        <div className="card" style={{ overflow: "hidden", position: "relative" }}>
          <div style={{ aspectRatio: "4/5", position: "relative" }}>
            <Cover seed={ev?.name ?? "review"} height={320} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "var(--s-5)",
                right: "var(--s-5)",
                bottom: "var(--s-5)",
              }}
            >
              <div
                className="t-meta"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {night?.night_date ?? "Last night"}
                {venue?.name ? ` · ${venue.name}` : ""}
              </div>
              <div className="t-h1" style={{ color: "#fff", marginTop: "var(--s-1)" }}>
                {ev?.name ?? "Your event"}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h1 className="t-display-sm" style={{ lineHeight: 1.15 }}>
            How was it?
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            One tap. Helps the venue book better nights.
          </p>
        </div>

        <ReviewButtons guestId={guest.id} eventId={ev?.id ?? ""} />
      </div>
    </main>
  );
}
