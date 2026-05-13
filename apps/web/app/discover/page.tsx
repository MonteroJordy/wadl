import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtTime } from "@/lib/format";
import {
  Avatar,
  Button,
  Chip,
  IconSearch,
  WFrame,
} from "@/components/wadl";

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

const FILTERS = [
  "Tonight",
  "Weekend",
  "Free",
  "House",
  "Techno",
  "Brooklyn",
  "Manhattan",
];

// Deterministic per-event header gradient — keeps the design's "venue
// vibe" feel without shipping a real moodboard. Indexes the event id.
function vibeGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const palette = [
    "oklch(0.4 0.15 260)", // cobalt
    "oklch(0.35 0.12 25)", // warm red
    "oklch(0.3 0.1 130)", // muted green
    "oklch(0.42 0.13 320)", // magenta
    "oklch(0.38 0.11 65)", // amber
  ];
  return palette[h % palette.length];
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
    <main id="main-content">
      <WFrame wide maxWidth={1200} style={{ paddingBottom: 48 }}>
        {/* Top meta + search */}
        <div
          style={{
            padding: "20px 20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="w-type-meta">BROWSE · TONIGHT</span>
          <Link
            href="/login"
            aria-label="Search"
            style={{ color: "var(--w-fg-muted)" }}
          >
            <IconSearch />
          </Link>
        </div>

        {/* Display headline — bigger on desktop for Shotgun-style impact */}
        <div style={{ padding: "16px 20px 0" }}>
          <div
            className="w-type-display-lg"
            style={{
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              fontWeight: 800,
            }}
          >
            This week,
            <br />
            at the door.
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 12,
              maxWidth: 480,
            }}
          >
            Every guest list in town in one feed. Tap to RSVP. No login
            wall, no third-party tracking.
          </p>
        </div>

        {/* Horizontal chip scroller — taller pill buttons for tap targets */}
        <div
          style={{
            padding: "24px 20px 0",
            display: "flex",
            gap: 8,
            overflowX: "auto",
          }}
          className="w-noscroll"
        >
          {FILTERS.map((c, i) => (
            <button
              key={c}
              type="button"
              style={{
                flexShrink: 0,
                height: 36,
                padding: "0 14px",
                background:
                  i === 0 ? "var(--w-acc)" : "var(--w-surface-2)",
                color: i === 0 ? "var(--w-acc-ink)" : "var(--w-fg)",
                border: `1px solid ${
                  i === 0 ? "var(--w-acc)" : "var(--w-line)"
                }`,
                fontFamily: "var(--w-sans)",
                fontSize: 13,
                fontWeight: i === 0 ? 600 : 500,
                cursor: "pointer",
                transition:
                  "background 0.12s, border-color 0.12s, color 0.12s",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {events.length === 0 ? (
          <div style={{ padding: "48px 20px 0", textAlign: "center" }}>
            <div className="w-type-h2">Nothing live</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              New nights drop weekly.
            </p>
            <Link
              href="/login"
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              I run a room →
            </Link>
          </div>
        ) : (
          <>
            {tonightEvents.length > 0 && (
              <>
                <SectionLabel>HAPPENING TONIGHT</SectionLabel>
                <div
                  className="w-discover-grid"
                  style={{
                    padding: "0 20px",
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {tonightEvents.map((e) => (
                    <DiscoverCard key={e.id} event={e} live />
                  ))}
                </div>
              </>
            )}

            {upcomingEvents.length > 0 && (
              <>
                <SectionLabel>COMING UP</SectionLabel>
                <div
                  className="w-discover-grid"
                  style={{
                    padding: "0 20px",
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {upcomingEvents.map((e) => (
                    <DiscoverCard key={e.id} event={e} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <SectionLabel>FROM PROMOTERS YOU FOLLOW</SectionLabel>
        <div
          style={{
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            ["House Brand", "presents UNFOUNDED · 09 May"],
            ["Diplo", "b2b TBA · 16 May"],
            ["Bossa Nova", "Saturday Resident · weekly"],
          ].map(([a, b]) => (
            <div
              key={a}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: "#ffffff05",
                borderRadius: 0,
                border: "1px solid var(--w-line)",
              }}
            >
              <Avatar name={a} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{a}</div>
                <div
                  className="w-type-meta"
                  style={{ marginTop: 2 }}
                >
                  {b}
                </div>
              </div>
              <Button variant="ghost" style={{ height: 28, fontSize: 11 }}>
                FOLLOW
              </Button>
            </div>
          ))}
        </div>

        <div style={{ height: 40 }} />
      </WFrame>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "28px 20px 12px",
      }}
    >
      <span className="w-type-meta">{children}</span>
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
  const grad = vibeGradient(event.id);
  const date = new Date(first.doors_at);
  const dow = date
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const day = date.getDate();
  const monthShort = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();

  return (
    <Link
      href={`/e/${event.id}`}
      className="w-discover-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        className="w-card"
        style={{
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transition: "transform 0.18s ease, border-color 0.18s ease",
        }}
      >
        {/* COVER — tall, image-first */}
        <div
          style={{
            aspectRatio: "4 / 5",
            background: `linear-gradient(135deg, ${grad} 0%, #0a0a0b 100%)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {event.flyer_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.flyer_url}
                alt=""
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.85) 100%)",
                }}
              />
            </>
          ) : null}

          {/* Date stub, top-left */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              padding: "6px 10px",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "var(--w-mono)",
              color: "#fff",
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: "0.08em" }}>
              {dow}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{day}</span>
            <span
              style={{ fontSize: 10, letterSpacing: "0.08em", opacity: 0.7 }}
            >
              {monthShort}
            </span>
          </div>

          {/* LIVE chip, top-right */}
          {live && (
            <span
              className="w-chip w-chip--acc"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                fontWeight: 600,
              }}
            >
              <span
                className="w-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  background: "currentColor",
                }}
              />
              LIVE TONIGHT
            </span>
          )}

          {/* Event name overlay at bottom */}
          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,
              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              {event.name}
            </div>
            {venueLine && (
              <div
                className="w-type-meta"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 6,
                  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                {venueLine.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* META + CTA strip */}
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "var(--w-surface-2)",
          }}
        >
          <div
            className="w-type-meta"
            style={{
              color: "var(--w-fg-muted)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span>DOORS {fmtTime(first.doors_at).toUpperCase()}</span>
            {cap ? (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{cap} CAP</span>
              </>
            ) : null}
          </div>
          <span
            className="w-type-meta"
            style={{
              color: "var(--w-acc)",
              fontWeight: 600,
            }}
          >
            RSVP →
          </span>
        </div>
      </div>
    </Link>
  );
}
