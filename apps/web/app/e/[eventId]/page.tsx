import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import ShareEventButton from "@/components/share-event-button";
import { getAppUrl } from "@/lib/app-url";

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
    ev.description?.slice(0, 200) ?? `RSVP to ${ev.name}${venueLine ? ` at ${venueLine}` : ""}`;
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
  venue: { name: string | null; city: string | null; address: string | null } | null;
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
      "id, name, description, flyer_url, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, is_frozen), venue:venues(name, city, address)"
    )
    .eq("id", params.eventId)
    .maybeSingle<EventDetail>();

  if (!event) notFound();

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );

  const now = Date.now();
  const upcoming = nights.filter((n) => new Date(n.doors_at).getTime() >= now - 2 * 60 * 60_000);
  const showNights = upcoming.length > 0 ? upcoming : nights;

  return (
    <main id="main-content" className="min-h-screen">
      {/* Sticky chrome */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <Link href="/discover" className="label-mono hover:text-cream transition">
            ← Discover
          </Link>
          <Link
            href="/"
            className="font-display text-2xl text-coral tracking-wide"
          >
            WADL
          </Link>
          <Link href="/mytickets" className="label-mono hover:text-cream transition">
            My tickets
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-16 grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-10">
        {/* Flyer column */}
        <div>
          {event.flyer_url ? (
            <div
              className="w-full rounded-2xl overflow-hidden border border-line"
              style={{ aspectRatio: "4 / 5" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.flyer_url}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-full rounded-2xl flex items-center justify-center border border-line"
              style={{
                aspectRatio: "4 / 5",
                background:
                  "linear-gradient(135deg, #1a050d 0%, #0a0a0a 50%, #14060a 100%)",
              }}
            >
              <p className="font-display text-7xl text-coral/30 uppercase">
                {event.name.slice(0, 2)}
              </p>
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="flex flex-col">
          <h1 className="font-display text-4xl md:text-6xl text-cream uppercase tracking-wide leading-[0.95] mb-3">
            {event.name}
          </h1>

      {event.venue?.name && (
        <div className="mb-4">
          <p className="label-mono">Venue</p>
          <p className="font-sans text-cream">{event.venue.name}</p>
          <p className="label-mono">
            {[event.venue.address, event.venue.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      {event.description && (
        <div className="mb-6">
          <p className="label-mono">About</p>
          <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
      )}

      {(() => {
        const allFrozen = nights.length > 0 && nights.every((n) => n.is_frozen);
        const allPast = nights.length > 0 && upcoming.length === 0;
        if (allPast) {
          return (
            <div className="card border-line text-center mb-6">
              <p className="label-mono mb-2">This event ended</p>
              <p className="text-cream/80 text-sm mb-3">
                Doors are closed. Tell the venue how it went, or browse what&apos;s next.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/e/${event.id}/feedback`}
                  className="btn-ghost text-center"
                >
                  Leave feedback
                </Link>
                <Link
                  href="/discover"
                  className="btn-primary text-center"
                >
                  Discover events
                </Link>
              </div>
            </div>
          );
        }
        if (allFrozen) {
          return (
            <div className="card border-coral mb-6">
              <p className="label-mono text-coral mb-1">⚠ At capacity</p>
              <p className="text-cream/80 text-sm">
                Every night sold out. Want to be next time? Follow the host
                for the next drop.
              </p>
            </div>
          );
        }
        return null;
      })()}

      <p className="label-mono mb-2">{upcoming.length > 0 ? "Upcoming nights" : "All nights"}</p>
      <div className="flex flex-col gap-2 mb-6">
        {showNights.map((n) => {
          const canRsvp = !n.is_frozen;
          return (
            <div key={n.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-cream font-semibold">
                    {fmtDate(n.night_date)}
                  </p>
                  <p className="label-mono mt-1">
                    Doors {fmtTime(n.doors_at)}
                    {n.is_frozen ? " · CLOSED" : ""}
                  </p>
                </div>
                {canRsvp ? (
                  <Link
                    href={`/e/${event.id}/rsvp?night=${n.id}`}
                    className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-3 rounded-md hover:brightness-110 transition shrink-0"
                  >
                    RSVP
                  </Link>
                ) : (
                  <span className="label-mono">List closed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ShareEventButton
        url={`${getAppUrl()}/e/${event.id}`}
        title={event.name}
        text={`${event.name} on WADL${event.venue?.name ? ` · ${event.venue.name}` : ""}`}
      />

      <p className="label-mono mt-8 pt-8 text-center md:text-left border-t border-line">
        Already have a ticket?{" "}
        <Link href="/mytickets" className="text-coral hover:brightness-125">
          My tickets →
        </Link>
      </p>
        </div>
      </div>
    </main>
  );
}
