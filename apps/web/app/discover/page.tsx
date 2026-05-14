import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtTime } from "@/lib/format";
import { Cover, Logo } from "@/components/v5";

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
      "id, name, description, flyer_url, event_nights(id, night_date, doors_at, capacity_cap), venue:venues(name, city)",
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

  const tonightEvents = events.filter((e) =>
    isSameDay(new Date(e.event_nights[0].doors_at), today),
  );
  const upcomingEvents = events.filter((e) => !tonightEvents.includes(e));

  return (
    <main id="main-content" className="v5">
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        {/* Top nav */}
        <div
          style={{
            height: 56,
            padding: "0 var(--s-8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Logo size={18} />
          <Link href="/login" className="btn btn--ghost btn--sm">
            Sign in
          </Link>
        </div>

        {/* Hero header */}
        <div
          style={{
            padding: "var(--s-8) var(--s-8) var(--s-6)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Tonight, somewhere
          </div>
          <div className="t-display-md">
            The list, the door,
            <br />
            the night.
          </div>
          <div
            className="t-body-2"
            style={{ marginTop: "var(--s-3)", maxWidth: 480 }}
          >
            Every guest list in town in one feed. Tap to RSVP. No login wall,
            no third-party tracking.
          </div>
        </div>

        {events.length === 0 ? (
          <div
            style={{
              padding: "var(--s-20) var(--s-8)",
              textAlign: "center",
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            <div className="t-display-sm">Nothing live</div>
            <div className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
              New nights drop weekly.
            </div>
            <Link
              href="/login"
              className="btn"
              style={{ marginTop: "var(--s-6)" }}
            >
              I run a room
            </Link>
          </div>
        ) : (
          <>
            {tonightEvents.length > 0 && (
              <Section label={`Happening tonight · ${tonightEvents.length}`}>
                {tonightEvents.map((e) => (
                  <DiscoverCard key={e.id} event={e} live />
                ))}
              </Section>
            )}
            {upcomingEvents.length > 0 && (
              <Section label={`Coming up · ${upcomingEvents.length}`}>
                {upcomingEvents.map((e) => (
                  <DiscoverCard key={e.id} event={e} />
                ))}
              </Section>
            )}
          </>
        )}

        <div style={{ height: 48 }} />
      </div>
    </main>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "var(--s-8)" }}>
      <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gap: "var(--s-4)",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DiscoverCard({
  event,
  live,
}: {
  event: DiscoverRow;
  live?: boolean;
}) {
  const first = event.event_nights[0];
  const cap = first.capacity_cap ?? null;
  const venueLine = [event.venue?.name, event.venue?.city]
    .filter(Boolean)
    .join(" · ");
  const date = new Date(first.doors_at);
  const dow = date.toLocaleDateString("en-US", { weekday: "short" });
  const metaLine = [
    dow,
    venueLine || null,
    `${fmtTime(first.doors_at)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/e/${event.id}`}
      className="card card--hover"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Cover seed={event.name} height={200}>
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
            {metaLine}
          </div>
          <div
            className="t-h1"
            style={{ marginTop: "var(--s-1)", color: "#fff" }}
          >
            {event.name}
          </div>
        </div>
      </Cover>
      <div
        style={{
          padding: "var(--s-4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className={"chip " + (live ? "chip--ok" : "chip--ghost")}>
          {live ? "Live tonight" : cap ? `${cap} cap` : "On sale"}
        </span>
        <span className="btn btn--sm">RSVP</span>
      </div>
    </Link>
  );
}
