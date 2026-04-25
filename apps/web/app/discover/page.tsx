import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import EmptyState from "@/components/empty-state";

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

export default async function DiscoverPage() {
  const admin = createAdminClient();

  // Only events with at least one upcoming night in the next 60 days.
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60_000);

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

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-start justify-between pt-6 pb-4">
        <div>
          <p className="label-mono mb-1">WADL</p>
          <h1 className="display-lg">Tonight<br />and after.</h1>
        </div>
        <Link href="/mytickets" className="label-mono hover:text-cream">
          My tickets →
        </Link>
      </header>

      {events.length === 0 ? (
        <EmptyState
          title="Nothing live"
          body="Check back. New nights drop weekly."
        />
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          {events.map((e) => {
            const first = e.event_nights[0];
            return (
              <Link
                key={e.id}
                href={`/e/${e.id}`}
                className="block rounded-lg overflow-hidden border border-line hover:border-coral transition"
              >
                {e.flyer_url ? (
                  <div
                    className="w-full bg-s2"
                    style={{ aspectRatio: "4 / 5" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.flyer_url}
                      alt={e.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full bg-s2 flex items-center justify-center"
                    style={{ aspectRatio: "4 / 5" }}
                  >
                    <p className="font-display text-5xl text-coral/40 uppercase">
                      {e.name.slice(0, 2)}
                    </p>
                  </div>
                )}
                <div className="p-4">
                  <p className="label-mono mb-1">
                    {fmtDate(first.night_date)} · Doors {fmtTime(first.doors_at)}
                    {e.event_nights.length > 1 && (
                      <span className="text-cream"> · +{e.event_nights.length - 1} more</span>
                    )}
                  </p>
                  <p className="font-sans font-semibold text-cream text-lg leading-snug">
                    {e.name}
                  </p>
                  {e.venue?.name && (
                    <p className="label-mono mt-1">
                      {e.venue.name}
                      {e.venue.city ? ` · ${e.venue.city}` : ""}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="label-mono mt-auto pt-8 text-center">
        Are you a venue, brand, or promoter?{" "}
        <Link href="/login" className="text-coral hover:brightness-125">
          Log in →
        </Link>
      </p>
    </main>
  );
}
