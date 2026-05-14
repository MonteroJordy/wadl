import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import ShareEventButton from "@/components/share-event-button";
import { getAppUrl } from "@/lib/app-url";
import { CoverHeader, Logo } from "@/components/v5";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { eventId: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, name, description, venue:venues(name, city)")
    .eq("id", params.eventId)
    .maybeSingle<{
      id: string;
      name: string;
      description: string | null;
      venue: { name: string | null; city: string | null } | null;
    }>();

  if (!ev) {
    return { title: "Event — WADL" };
  }
  const venueLine = [ev.venue?.name, ev.venue?.city].filter(Boolean).join(" · ");
  const description =
    ev.description?.slice(0, 200) ??
    `RSVP to ${ev.name}${venueLine ? ` at ${venueLine}` : ""}`;
  const ogImage = `/api/og/event/${params.eventId}`;
  return {
    title: ev.name,
    description,
    openGraph: {
      title: ev.name,
      description,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ev.name,
      description,
      images: [ogImage],
    },
  };
}

interface EventDetail {
  id: string;
  name: string;
  description: string | null;
  flyer_url: string | null;
  event_nights: Array<{
    id: string;
    night_date: string;
    doors_at: string;
    cutoff_at: string | null;
    capacity_cap: number | null;
    is_frozen: boolean;
  }>;
  venue: {
    name: string | null;
    city: string | null;
    address: string | null;
  } | null;
}

export default async function EventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      "id, name, description, flyer_url, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, is_frozen), venue:venues(name, city, address)",
    )
    .eq("id", params.eventId)
    .maybeSingle<EventDetail>();

  if (!event) notFound();

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1,
  );

  const now = Date.now();
  const upcoming = nights.filter(
    (n) => new Date(n.doors_at).getTime() >= now - 2 * 60 * 60_000,
  );
  const showNights = upcoming.length > 0 ? upcoming : nights;

  const allPast = nights.length > 0 && upcoming.length === 0;
  const allFrozen = nights.length > 0 && nights.every((n) => n.is_frozen);
  const firstNight = showNights[0];

  const eyebrowParts: string[] = [];
  if (firstNight) {
    eyebrowParts.push(fmtDate(firstNight.night_date));
    eyebrowParts.push(`doors ${fmtTime(firstNight.doors_at)}`);
  }
  if (event.venue?.name) {
    eyebrowParts.push(
      [event.venue.name, event.venue.city].filter(Boolean).join(" · "),
    );
  }

  let heroAction: React.ReactNode = null;
  if (allPast) heroAction = <span className="chip">Event ended</span>;
  else if (allFrozen)
    heroAction = <span className="chip chip--warn">At capacity</span>;
  else if (nights.length > 1)
    heroAction = <span className="chip chip--ok">{nights.length} nights</span>;
  else heroAction = <span className="chip chip--ok">On sale</span>;

  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      {/* top nav */}
      <div
        style={{
          height: 56,
          padding: "0 var(--s-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/discover" style={{ textDecoration: "none" }}>
          <Logo size={18} />
        </Link>
        <Link
          href="/login"
          className="btn btn--ghost"
          style={{ textDecoration: "none" }}
        >
          Sign in
        </Link>
      </div>

      <CoverHeader
        seed={event.name}
        eyebrow={eyebrowParts.join(" · ")}
        title={event.name}
        actions={heroAction}
        height={500}
      />

      <div
        className="event-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "var(--s-12)",
          padding: "var(--s-12)",
        }}
      >
        {/* left — facts */}
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {[
              ["Date", firstNight ? fmtDate(firstNight.night_date) : "TBA"],
              ["Doors", firstNight ? fmtTime(firstNight.doors_at) : "TBA"],
              [
                "Close",
                firstNight?.cutoff_at ? fmtTime(firstNight.cutoff_at) : "Late",
              ],
              [
                "Cap",
                firstNight?.capacity_cap
                  ? String(firstNight.capacity_cap)
                  : "—",
              ],
            ].map(([k, v], i) => (
              <div
                key={k}
                style={{
                  padding: "var(--s-5) 0",
                  borderRight: i < 3 ? "1px solid var(--line)" : "none",
                  paddingLeft: i === 0 ? 0 : "var(--s-5)",
                }}
              >
                <div className="t-meta">{k}</div>
                <div
                  className="t-display-sm"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {event.venue?.name && (
            <div style={{ marginTop: "var(--s-10)" }}>
              <div className="t-meta">Venue</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-2)" }}
              >
                {event.venue.name}
              </div>
              {(event.venue.address || event.venue.city) && (
                <div className="t-body-2" style={{ marginTop: "var(--s-1)" }}>
                  {[event.venue.address, event.venue.city]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>
          )}

          {event.description && (
            <div style={{ marginTop: "var(--s-10)" }}>
              <div className="t-meta">About</div>
              <p
                className="t-body"
                style={{
                  marginTop: "var(--s-2)",
                  whiteSpace: "pre-wrap",
                  color: "var(--fg-2)",
                }}
              >
                {event.description}
              </p>
            </div>
          )}

          {!allPast && !allFrozen && (
            <div style={{ marginTop: "var(--s-10)" }}>
              <div className="t-meta">
                {upcoming.length > 0 ? "Upcoming nights" : "All nights"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                  marginTop: "var(--s-3)",
                }}
              >
                {showNights.map((n) => {
                  const canRsvp = !n.is_frozen;
                  return (
                    <div
                      key={n.id}
                      className="card"
                      style={{
                        padding: "var(--s-4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--s-3)",
                      }}
                    >
                      <div>
                        <div className="t-h2">{fmtDate(n.night_date)}</div>
                        <div
                          className="t-meta"
                          style={{ marginTop: "var(--s-1)" }}
                        >
                          Doors {fmtTime(n.doors_at)}
                          {n.is_frozen ? " · closed" : ""}
                        </div>
                      </div>
                      {canRsvp ? (
                        <Link
                          href={`/e/${event.id}/rsvp?night=${n.id}`}
                          className="btn btn--sm"
                          style={{ textDecoration: "none" }}
                        >
                          RSVP
                        </Link>
                      ) : (
                        <span className="chip">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "var(--s-5)" }}>
                <ShareEventButton
                  url={`${getAppUrl()}/e/${event.id}`}
                  title={event.name}
                  text={`${event.name} on WADL${event.venue?.name ? ` · ${event.venue.name}` : ""}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* right — RSVP panel */}
        <div className="card" style={{ padding: "var(--s-6)", height: "fit-content" }}>
          {allPast ? (
            <>
              <span className="chip">Event ended</span>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                Doors are closed. Tell the venue how it went, or browse
                what&apos;s next.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--s-2)",
                  marginTop: "var(--s-5)",
                }}
              >
                <Link
                  href={`/e/${event.id}/feedback`}
                  className="btn btn--ghost"
                  style={{ textDecoration: "none" }}
                >
                  Leave feedback
                </Link>
                <Link
                  href="/discover"
                  className="btn"
                  style={{ textDecoration: "none" }}
                >
                  Discover
                </Link>
              </div>
            </>
          ) : allFrozen ? (
            <>
              <span className="chip chip--warn">At capacity</span>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                Every night sold out. Follow the host for the next drop.
              </p>
            </>
          ) : (
            <>
              <div className="t-meta">Get on the list</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-2)" }}
              >
                30 seconds.
              </div>
              <p className="t-body-2" style={{ marginTop: "var(--s-1)" }}>
                No account, no password. We text you a credential.
              </p>
              {firstNight && !firstNight.is_frozen && (
                <Link
                  href={`/e/${event.id}/rsvp?night=${firstNight.id}`}
                  className="btn btn--xl btn--block"
                  style={{
                    textDecoration: "none",
                    marginTop: "var(--s-5)",
                  }}
                >
                  RSVP
                </Link>
              )}
              <div
                className="t-meta"
                style={{
                  textAlign: "center",
                  marginTop: "var(--s-3)",
                  color: "var(--fg-4)",
                }}
              >
                Free RSVP · no charge
              </div>
            </>
          )}

          <div
            className="t-meta"
            style={{
              marginTop: "var(--s-6)",
              paddingTop: "var(--s-4)",
              borderTop: "1px solid var(--line)",
              color: "var(--fg-4)",
            }}
          >
            Already have a ticket?{" "}
            <Link
              href="/mytickets"
              style={{ color: "var(--fg)", textDecoration: "none" }}
            >
              My tickets →
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "var(--s-5) var(--s-12)",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: "var(--ts-xs)",
          color: "var(--fg-4)",
        }}
      >
        <span>Powered by WADL</span>
        <span>Share · /e/{event.id.slice(0, 8)}</span>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .event-grid {
            grid-template-columns: 1.4fr 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
