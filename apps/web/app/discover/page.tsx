import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface DiscoverRow {
  id: string;
  name: string;
  description: string | null;
  flyer_url: string | null;
  event_nights: Array<{
    id: string;
    night_date: string;
    doors_at: string;
    capacity_cap: number | null;
  }>;
  venue: { name: string | null; city: string | null } | null;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function DiscoverPage() {
  const admin = createAdminClient();

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60_000);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const { data: raw } = await admin
    .from("events")
    .select(
      "id, name, description, flyer_url, event_nights(id, night_date, doors_at, capacity_cap), venue:venues(name, city)"
    )
    .order("created_at", { ascending: false });

  const events: DiscoverRow[] = ((raw ?? []) as unknown as DiscoverRow[])
    .map((e) => ({
      ...e,
      event_nights: e.event_nights
        .filter((n) => {
          const d = new Date(n.doors_at);
          return d >= new Date(now.getTime() - 2 * 60 * 60_000) && d <= horizon;
        })
        .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1)),
    }))
    .filter((e) => e.event_nights.length > 0);

  // Tonight = events whose first upcoming night is today.
  const tonightEvents = events.filter((e) =>
    isSameDay(new Date(e.event_nights[0].doors_at), today)
  );
  const upcomingEvents = events.filter((e) => !tonightEvents.includes(e));

  return (
    <main id="main-content" className="min-h-screen relative">
      {/* Sticky top chrome — anchors brand on every scroll */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl text-coral tracking-wide"
          >
            WADL
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/mytickets"
              className="label-mono hover:text-cream transition"
            >
              My tickets
            </Link>
            <Link
              href="/login"
              className="font-sans font-semibold text-xs uppercase tracking-[0.16em] px-4 py-2 rounded-full bg-s2 border border-line text-cream hover:border-coral transition"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
        <p className="label-mono mb-2">Discover</p>
        <h1 className="font-display text-5xl md:text-7xl text-cream uppercase tracking-wide leading-[0.9] mb-2">
          Tonight
          <span className="text-coral">.</span>
        </h1>
        <p className="text-muted text-base max-w-xl mb-10">
          {events.length === 0
            ? "Nothing live right now. New nights drop weekly."
            : `${events.length} live event${events.length === 1 ? "" : "s"} · ${
                tonightEvents.length
              } tonight`}
        </p>

        {events.length === 0 ? (
          <section className="rounded-2xl border border-line bg-s1 px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-coral/10 border border-coral/30 mx-auto mb-5 flex items-center justify-center">
              <span className="font-display text-3xl text-coral">∅</span>
            </div>
            <p className="font-display text-3xl text-cream uppercase tracking-wide mb-2">
              Nothing live
            </p>
            <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
              Check back. New nights drop weekly. If you run a room, list yours.
            </p>
            <Link
              href="/login"
              className="inline-flex mt-6 items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
            >
              I run a room →
            </Link>
          </section>
        ) : (
          <>
            {tonightEvents.length > 0 && (
              <section className="mb-10">
                <p className="label-mono mb-3 flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-coral"
                    style={{ animation: "wadl-pulse-coral 2s infinite" }}
                  />
                  Live tonight · {tonightEvents.length}
                </p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {tonightEvents.map((e) => (
                    <EventCard key={e.id} event={e} hero />
                  ))}
                </div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section>
                <p className="label-mono mb-3">
                  Coming up · {upcomingEvents.length}
                </p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingEvents.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="label-mono mt-12 text-center">
          Are you a venue, brand, or promoter?{" "}
          <Link href="/login" className="text-coral hover:brightness-125 underline">
            Run your own door →
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes wadl-pulse-coral {
          0% { box-shadow: 0 0 0 0 rgba(255,74,43,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(255,74,43,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,74,43,0); }
        }
      `}</style>
    </main>
  );
}

function EventCard({
  event,
  hero,
}: {
  event: DiscoverRow;
  hero?: boolean;
}) {
  const first = event.event_nights[0];
  return (
    <Link
      href={`/e/${event.id}`}
      className={`group relative block rounded-2xl overflow-hidden border transition ${
        hero
          ? "border-coral/30 hover:border-coral"
          : "border-line hover:border-coral/60"
      }`}
    >
      <div
        className="w-full bg-s2 relative"
        style={{ aspectRatio: "4 / 5" }}
      >
        {event.flyer_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.flyer_url}
              alt={event.name}
              className="w-full h-full object-cover transition group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #1a050d 0%, #0a0a0a 50%, #14060a 100%)",
            }}
          >
            <p className="font-display text-7xl text-coral/30 uppercase">
              {event.name.slice(0, 2)}
            </p>
          </div>
        )}
        {hero && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-coral/90 backdrop-blur-sm px-2.5 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest text-bg font-semibold">
            <span
              className="w-1.5 h-1.5 rounded-full bg-bg"
              style={{ animation: "wadl-pulse-coral 2s infinite" }}
            />
            Tonight
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="label-mono mb-1 text-cream/70">
          {fmtDate(first.night_date)} · Doors {fmtTime(first.doors_at)}
          {event.event_nights.length > 1 && (
            <span className="text-cream"> · +{event.event_nights.length - 1} more</span>
          )}
        </p>
        <p className="font-display text-2xl text-cream uppercase tracking-wide leading-tight line-clamp-2">
          {event.name}
        </p>
        {event.venue?.name && (
          <p className="label-mono mt-1">
            {event.venue.name}
            {event.venue.city ? ` · ${event.venue.city}` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
