import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, Logo } from "@/components/v5";
import { fmtDate, fmtTime } from "@/lib/format";
import GuestlessRsvpForm from "./rsvp-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "RSVP — WADL" };

interface PageProps {
  params: { token: string };
}

export default async function GuestlessLanding({ params }: PageProps) {
  const supabase = createAdminClient();

  // Load the allocation by token, only if it's marked guestless + open.
  const { data: allocation } = await supabase
    .from("allocations")
    .select(
      "id, holder_name, cap, list_open, guestless, event_night_id, magic_link_token",
    )
    .eq("magic_link_token", params.token)
    .maybeSingle();

  if (!allocation || !allocation.guestless) {
    notFound();
  }

  // Load the night + event for the cover hero.
  const { data: night } = await supabase
    .from("event_nights")
    .select(
      "id, night_date, doors_at, event:events ( id, name, flyer_url, venue:venues ( name, city ) )",
    )
    .eq("id", allocation.event_night_id)
    .maybeSingle();

  if (!night?.event) notFound();

  // Count current accepted guests to compute remaining cap.
  const { count: filled } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("allocation_id", allocation.id)
    .in("status", ["approved", "pending"]);

  const remaining = Math.max(0, allocation.cap - (filled ?? 0));
  const listFull = remaining === 0 || !allocation.list_open;

  const ev = Array.isArray(night.event) ? night.event[0] : night.event;
  const venue = Array.isArray(ev.venue) ? ev.venue[0] : ev.venue;

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
      <header
        style={{
          padding: "var(--s-4) var(--s-5)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={20} />
        <Link
          href="/login"
          className="t-meta"
          style={{ color: "var(--fg-2)", textDecoration: "none" }}
        >
          HAVE AN ACCOUNT?
        </Link>
      </header>

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "var(--s-5)", width: "100%" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ aspectRatio: "4/5", position: "relative" }}>
            {ev.flyer_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ev.flyer_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Cover seed={ev.name} height={420} />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.88) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "var(--s-4)",
                right: "var(--s-4)",
                bottom: "var(--s-4)",
              }}
            >
              <div
                className="t-meta"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {fmtDate(night.night_date)} · {fmtTime(night.doors_at)}
                {venue?.name ? ` · ${venue.name}` : ""}
              </div>
              <div
                className="t-h1"
                style={{ marginTop: "var(--s-1)", color: "#fff" }}
              >
                {ev.name}
              </div>
            </div>
          </div>

          <div style={{ padding: "var(--s-5)" }}>
            {listFull ? (
              <div>
                <span className="chip chip--warn">List full</span>
                <p
                  className="t-body-2"
                  style={{ marginTop: "var(--s-3)" }}
                >
                  This list is at capacity. Check back in case spots open up.
                </p>
              </div>
            ) : (
              <>
                <div className="t-meta">
                  {allocation.holder_name} · {remaining} spot
                  {remaining === 1 ? "" : "s"} left
                </div>
                <GuestlessRsvpForm token={params.token} />
              </>
            )}
          </div>
        </div>

        <p
          className="t-meta"
          style={{
            textAlign: "center",
            marginTop: "var(--s-4)",
            color: "var(--fg-3)",
          }}
        >
          NO ACCOUNT NEEDED · YOUR PASS ARRIVES INSTANTLY
        </p>
      </div>
    </main>
  );
}
