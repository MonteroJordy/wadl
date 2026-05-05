import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import ShareEventButton from "@/components/share-event-button";
import { getAppUrl } from "@/lib/app-url";
import { Button, Chip, IconPin, Wordmark } from "@/components/wadl";

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

  return (
    <main
      id="main-content"
      className="w-app"
      style={{ minHeight: "100vh", background: "var(--w-bg)" }}
    >
      {/* tiny nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--w-line)",
        }}
      >
        <Link href="/discover" style={{ textDecoration: "none" }}>
          <Wordmark variant="monogrid" size={16} />
        </Link>
        <span className="w-type-meta">EVENT · {event.name.toUpperCase()}</span>
        <Link
          href="/login"
          className="w-btn w-btn--ghost"
          style={{ height: 36, textDecoration: "none" }}
        >
          Sign in
        </Link>
      </div>

      <div
        className="event-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          minHeight: "calc(100vh - 60px)",
        }}
      >
        {/* left — cover */}
        <div
          style={{
            position: "relative",
            background:
              "linear-gradient(135deg, oklch(0.32 0.06 255), oklch(0.18 0.04 280))",
            overflow: "hidden",
            minHeight: 480,
          }}
        >
          {event.flyer_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.flyer_url}
                alt={event.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.5,
                }}
              />
            </>
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "48px 32px 40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              background:
                "linear-gradient(135deg, transparent 0%, rgba(15,15,16,0.65) 100%)",
            }}
          >
            <div className="w-type-meta">
              {firstNight ? fmtDate(firstNight.night_date).toUpperCase() : ""}
              {firstNight ? ` · DOORS ${fmtTime(firstNight.doors_at)}` : ""}
            </div>
            <div
              style={{
                fontSize: "clamp(56px, 9vw, 96px)",
                fontWeight: 800,
                letterSpacing: "-0.045em",
                lineHeight: 0.9,
                marginTop: 18,
                fontFamily: "var(--w-display)",
              }}
            >
              {event.name}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 32,
                flexWrap: "wrap",
              }}
            >
              {event.venue?.name && (
                <Chip
                  tone="ghost"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  <IconPin size={12} /> {event.venue.name}
                  {event.venue.city ? ` · ${event.venue.city}` : ""}
                </Chip>
              )}
              {firstNight?.capacity_cap && (
                <Chip
                  tone="ghost"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  {firstNight.capacity_cap} CAP
                </Chip>
              )}
              {nights.length > 1 && (
                <Chip
                  tone="ghost"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  {nights.length} NIGHTS
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* right — RSVP card */}
        <div
          style={{
            padding: "48px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="w-type-meta">PUBLIC EVENT</div>
          <div
            className="w-type-h1"
            style={{ marginTop: 8 }}
          >
            {event.name}
          </div>

          {event.description && (
            <p
              className="w-type-body"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {event.description}
            </p>
          )}

          {allPast ? (
            <div
              className="w-card"
              style={{ padding: 18, marginTop: 24 }}
            >
              <Chip tone="ghost">EVENT ENDED</Chip>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                }}
              >
                Doors are closed. Tell the venue how it went, or browse what&apos;s
                next.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <Link
                  href={`/e/${event.id}/feedback`}
                  className="w-btn w-btn--ghost"
                  style={{ textDecoration: "none" }}
                >
                  Leave feedback
                </Link>
                <Link
                  href="/discover"
                  className="w-btn w-btn--primary"
                  style={{ textDecoration: "none" }}
                >
                  Discover
                </Link>
              </div>
            </div>
          ) : allFrozen ? (
            <div
              className="w-card"
              style={{
                padding: 18,
                marginTop: 24,
                borderColor: "var(--w-warn)",
              }}
            >
              <Chip tone="warn">⚠ AT CAPACITY</Chip>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                }}
              >
                Every night sold out. Want to be next time? Follow the host for
                the next drop.
              </p>
            </div>
          ) : (
            <>
              <div className="w-type-meta" style={{ marginTop: 28 }}>
                {upcoming.length > 0 ? "UPCOMING NIGHTS" : "ALL NIGHTS"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {showNights.map((n) => {
                  const canRsvp = !n.is_frozen;
                  return (
                    <div
                      key={n.id}
                      className="w-card"
                      style={{
                        padding: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {fmtDate(n.night_date)}
                        </div>
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4 }}
                        >
                          DOORS {fmtTime(n.doors_at)}
                          {n.is_frozen ? " · CLOSED" : ""}
                        </div>
                      </div>
                      {canRsvp ? (
                        <Link
                          href={`/e/${event.id}/rsvp?night=${n.id}`}
                          className="w-btn w-btn--primary"
                          style={{ textDecoration: "none" }}
                        >
                          RSVP →
                        </Link>
                      ) : (
                        <Chip tone="ghost">CLOSED</Chip>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 24 }}>
                <ShareEventButton
                  url={`${getAppUrl()}/e/${event.id}`}
                  title={event.name}
                  text={`${event.name} on WADL${event.venue?.name ? ` · ${event.venue.name}` : ""}`}
                />
              </div>

              <div
                style={{ flex: 1, minHeight: 24 }}
                aria-hidden
              />

              <div
                className="w-type-h3"
                style={{ marginTop: 24 }}
              >
                Get on the list — 30 seconds.
              </div>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 6,
                }}
              >
                No account, no password. We text you a credential.
              </p>
              {firstNight && !firstNight.is_frozen && (
                <Link
                  href={`/e/${event.id}/rsvp?night=${firstNight.id}`}
                  style={{ textDecoration: "none", marginTop: 14 }}
                >
                  <Button variant="primary" size="lg" block>
                    Continue → RSVP
                  </Button>
                </Link>
              )}
            </>
          )}

          <div
            className="w-type-meta"
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: "1px solid var(--w-line)",
              color: "var(--w-fg-dim)",
            }}
          >
            ALREADY HAVE A TICKET?{" "}
            <Link
              href="/mytickets"
              style={{
                color: "var(--w-acc)",
                textDecoration: "none",
              }}
            >
              MY TICKETS →
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "20px 32px",
          borderTop: "1px solid var(--w-line)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--w-mono)",
          fontSize: 11,
          color: "var(--w-fg-dim)",
        }}
      >
        <span>POWERED BY WADL</span>
        <span>SHARE · /e/{event.id.slice(0, 8)}</span>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .event-grid {
            grid-template-columns: 1.3fr 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
