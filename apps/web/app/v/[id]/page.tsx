import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, CoverHeader, Logo } from "@/components/v5";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createAdminClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name, city")
    .eq("id", params.id)
    .maybeSingle();
  if (!venue) return { title: "Venue — WADL" };
  return {
    title: `${venue.name} — WADL`,
    description: `Upcoming nights at ${venue.name}${venue.city ? `, ${venue.city}` : ""}.`,
  };
}

interface UpcomingEvent {
  eventId: string;
  name: string;
  flyerUrl: string | null;
  nightDate: string;
}

export default async function VenuePublicProfile({ params }: PageProps) {
  const supabase = createAdminClient();

  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, city")
    .eq("id", params.id)
    .maybeSingle();
  if (!venue) notFound();

  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: nights } = await supabase
    .from("event_nights")
    .select(
      "night_date, event:events!inner ( id, name, flyer_url, venue_id )",
    )
    .gte("night_date", todayIso)
    .order("night_date", { ascending: true })
    .limit(60);

  // Filter to this venue + dedupe by event (earliest upcoming night wins).
  const seen = new Set<string>();
  const upcoming: UpcomingEvent[] = [];
  for (const n of nights ?? []) {
    const ev = Array.isArray(n.event) ? n.event[0] : n.event;
    if (!ev || ev.venue_id !== params.id) continue;
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    upcoming.push({
      eventId: ev.id,
      name: ev.name,
      flyerUrl: ev.flyer_url,
      nightDate: n.night_date,
    });
  }

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          height: 56,
          padding: "0 var(--s-6)",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </header>

      <CoverHeader
        seed={`${venue.name} venue`}
        eyebrow={`Venue${venue.city ? ` · ${venue.city}` : ""}`}
        title={venue.name}
        height={420}
        actions={
          <Link
            href="/discover"
            className="btn btn--accent"
            style={{ textDecoration: "none" }}
          >
            See all nights
          </Link>
        }
      />

      <div style={{ padding: "var(--s-12)", maxWidth: 1200, margin: "0 auto" }}>
        <div className="t-meta">Upcoming</div>
        {upcoming.length === 0 ? (
          <div
            className="card"
            style={{
              marginTop: "var(--s-3)",
              padding: "var(--s-12) var(--s-8)",
              textAlign: "center",
              color: "var(--fg-3)",
            }}
          >
            <span className="t-body-2">
              No upcoming nights announced yet. Check back soon.
            </span>
          </div>
        ) : (
          <div
            style={{
              marginTop: "var(--s-3)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "var(--s-3)",
            }}
          >
            {upcoming.map((ev) => (
              <Link
                key={ev.eventId}
                href={`/e/${ev.eventId}`}
                className="card card--hover"
                style={{ textDecoration: "none", color: "inherit", overflow: "hidden" }}
              >
                <div style={{ position: "relative", height: 160 }}>
                  {ev.flyerUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={ev.flyerUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Cover seed={ev.name} height={160} />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)",
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
                      {fmtDate(ev.nightDate)}
                    </div>
                    <div
                      className="t-h1 truncate"
                      style={{ marginTop: "var(--s-1)", color: "#fff" }}
                    >
                      {ev.name}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
