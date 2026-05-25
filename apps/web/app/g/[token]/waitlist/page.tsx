import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, Logo } from "@/components/v5";
import { fmtDate, fmtTime } from "@/lib/format";
import WaitlistForm from "./waitlist-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Waitlist — WADL" };

interface PageProps {
  params: { token: string };
  searchParams: { position?: string };
}

export default async function WaitlistLanding({
  params,
  searchParams,
}: PageProps) {
  const supabase = createAdminClient();

  const { data: allocation } = await supabase
    .from("allocations")
    .select("id, holder_name, cap, list_open, guestless, event_night_id")
    .eq("magic_link_token", params.token)
    .maybeSingle();
  if (!allocation || !allocation.guestless) notFound();

  const { data: night } = await supabase
    .from("event_nights")
    .select(
      "night_date, doors_at, event:events ( name, venue:venues ( name, city ) )",
    )
    .eq("id", allocation.event_night_id)
    .maybeSingle();
  if (!night) notFound();

  const ev = Array.isArray(night.event) ? night.event[0] : night.event;
  const venue = Array.isArray(ev?.venue) ? ev?.venue[0] : ev?.venue;
  const position = parseInt(searchParams.position ?? "0", 10) || null;

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
        }}
      >
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
            <Cover seed={ev?.name ?? "waitlist"} height={320} />
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
                {fmtDate(night.night_date)} · {fmtTime(night.doors_at)}
                {venue?.name ? ` · ${venue.name}` : ""}
              </div>
              <div className="t-h1" style={{ color: "#fff", marginTop: "var(--s-1)" }}>
                {ev?.name ?? "Event"}
              </div>
            </div>
          </div>
        </div>

        <div>
          <span className="chip chip--warn">Waitlist</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-3)", lineHeight: 1.15 }}
          >
            {position
              ? `You're #${position} on the waitlist`
              : "You're on the waitlist"}
          </h1>
          <p
            className="t-body-2"
            style={{
              marginTop: "var(--s-2)",
              color: "var(--fg-2)",
              lineHeight: 1.5,
            }}
          >
            We&apos;ll text the moment a spot opens. Most lists move in the
            last hour before doors. Keep your phone on.
          </p>
        </div>

        <WaitlistForm token={params.token} />

        <Link
          href={`/g/${params.token}`}
          className="t-meta"
          style={{
            textAlign: "center",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          ← BACK TO THE INVITE
        </Link>
      </div>
    </main>
  );
}
