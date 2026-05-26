import * as React from "react";
import Link from "next/link";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import OnboardingTour from "@/components/onboarding-tour";
import { dashboardFraming } from "@wadl/shared/account-type";
import { Cover, CoverHeader, Stat } from "@/components/v5";

export const dynamic = "force-dynamic";

const RANGES = ["week", "month", "upcoming", "past"] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABEL: Record<Range, string> = {
  week: "This week",
  month: "This month",
  upcoming: "Upcoming",
  past: "Past",
};

interface NightWithEvent {
  id: string;
  event_id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
  is_frozen: boolean;
  event: {
    id: string;
    name: string;
    flyer_url: string | null;
    venue_id: string | null;
  } | null;
}

interface GuestRow {
  event_night_id: string;
  status: string;
  plus_ones: number;
}

interface CheckInRow {
  event_night_id: string;
  state: string;
}

function rangeWindow(range: Range): { start: Date | null; end: Date | null } {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  if (range === "week") {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 7);
    return { start: startOfDay, end };
  }
  if (range === "month") {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 30);
    return { start: startOfDay, end };
  }
  if (range === "upcoming") return { start: startOfDay, end: null };
  return { start: null, end: startOfDay };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function OwnerWeekViewPage({
  searchParams,
}: {
  searchParams: { q?: string; range?: string; venue?: string };
}) {
  const { supabase, account, profile } = await requireOwnerContext();

  const q = (searchParams.q ?? "").trim();
  const range: Range = RANGES.includes(searchParams.range as Range)
    ? (searchParams.range as Range)
    : "week";
  const { start, end } = rangeWindow(range);
  const venueFilter = (searchParams.venue ?? "").trim();

  // Venues + events run in parallel — neither depends on the other. The
  // venues query feeds the venue-filter dropdown UI; events applies the
  // venueFilter from searchParams independently.
  let eventsQ = supabase
    .from("events")
    .select(
      "id, name, flyer_url, venue_id, event_nights(id, event_id, night_date, doors_at, capacity_cap, is_frozen)",
    )
    .eq("account_id", account.id);
  if (q) eventsQ = eventsQ.ilike("name", `%${q}%`);
  if (venueFilter) eventsQ = eventsQ.eq("venue_id", venueFilter);

  const [venuesRes, eventsRes] = await Promise.all([
    supabase
      .from("venues")
      .select("id, name")
      .eq("account_id", account.id)
      .order("name"),
    eventsQ,
  ]);
  const venues = (venuesRes.data ?? []) as Array<{ id: string; name: string }>;
  const eventsData = eventsRes.data;

  const nights: NightWithEvent[] = [];
  for (const e of eventsData ?? []) {
    const ev = e as {
      id: string;
      name: string;
      flyer_url: string | null;
      venue_id: string | null;
      event_nights: Array<{
        id: string;
        event_id: string;
        night_date: string;
        doors_at: string;
        capacity_cap: number | null;
        is_frozen: boolean;
      }>;
    };
    for (const n of ev.event_nights ?? []) {
      const d = new Date(n.doors_at);
      const inRange =
        (start === null || d >= start) && (end === null || d <= end);
      if (!inRange) continue;
      nights.push({
        ...n,
        event: {
          id: ev.id,
          name: ev.name,
          flyer_url: ev.flyer_url,
          venue_id: ev.venue_id,
        },
      });
    }
  }

  nights.sort((a, b) =>
    range === "past"
      ? a.doors_at < b.doors_at
        ? 1
        : -1
      : a.doors_at < b.doors_at
        ? -1
        : 1,
  );

  let guests: GuestRow[] = [];
  let checkIns: CheckInRow[] = [];
  if (nights.length > 0) {
    const nightIds = nights.map((n) => n.id);
    const [guestsRes, checkInsRes] = await Promise.all([
      supabase
        .from("guests")
        .select("event_night_id, status, plus_ones")
        .in("event_night_id", nightIds),
      supabase
        .from("check_ins")
        .select("event_night_id, state")
        .in("event_night_id", nightIds),
    ]);
    guests = (guestsRes.data ?? []) as GuestRow[];
    checkIns = (checkInsRes.data ?? []) as CheckInRow[];
  }

  function statsFor(nightId: string) {
    let approved = 0;
    let pending = 0;
    let scanned = 0;
    let rsvps = 0;
    for (const g of guests) {
      if (g.event_night_id !== nightId) continue;
      const heads = 1 + (g.plus_ones ?? 0);
      rsvps += heads;
      if (g.status === "approved") approved += heads;
      else if (g.status === "pending") pending += heads;
    }
    for (const c of checkIns) {
      if (c.event_night_id !== nightId) continue;
      if (c.state === "approved") scanned++;
    }
    return { approved, pending, scanned, rsvps };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tonight = nights.find((n) =>
    isSameDay(new Date(n.doors_at), today),
  );
  const tonightStats = tonight ? statsFor(tonight.id) : null;
  const remainingNights = nights.filter((n) => n !== tonight);

  // Aggregate KPIs across the visible range
  const liveNow = nights.filter((n) => {
    const d = new Date(n.doors_at).getTime();
    return d <= Date.now() && d >= Date.now() - 8 * 60 * 60_000;
  }).length;
  const totalRsvpd = nights.reduce(
    (sum, n) => sum + statsFor(n.id).rsvps,
    0,
  );
  const totalScanned = nights.reduce(
    (sum, n) => sum + statsFor(n.id).scanned,
    0,
  );
  const distinctEvents = new Set(nights.map((n) => n.event_id)).size;

  function rangeHref(r: Range) {
    const sp = new URLSearchParams();
    if (r !== "week") sp.set("range", r);
    if (q) sp.set("q", q);
    if (venueFilter) sp.set("venue", venueFilter);
    const s = sp.toString();
    return s ? `/owner?${s}` : "/owner";
  }
  function venueHref(v: string) {
    const sp = new URLSearchParams();
    if (v) sp.set("venue", v);
    if (range !== "week") sp.set("range", range);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/owner?${s}` : "/owner";
  }

  // ─── v5 hero framing ───
  // When there's an event today, the hero counts down to doors; otherwise it
  // frames the current range. The seed drives the procedural cover gradient.
  const heroSeed = tonight?.event?.name ?? account.display_name;
  let heroEyebrow: string;
  if (tonight) {
    const doorsMs = new Date(tonight.doors_at).getTime() - Date.now();
    if (doorsMs > 0) {
      const h = Math.floor(doorsMs / 3_600_000);
      const m = Math.floor((doorsMs % 3_600_000) / 60_000);
      heroEyebrow = `Tonight · doors in ${h > 0 ? `${h}h ` : ""}${m}m`;
    } else {
      heroEyebrow = `Tonight · doors ${fmtTime(tonight.doors_at)}`;
    }
  } else {
    heroEyebrow = `${RANGE_LABEL[range]} · ${account.display_name}`;
  }
  // v5 hero title is 2-line: event name over "at <venue>" (matches the
  // V5Dashboard artboard's `Donato Dozzy<br/>at BR · BK`). The venue name is
  // resolved from the venues query already fetched above.
  const tonightVenueName = tonight?.event?.venue_id
    ? (venues.find((v) => v.id === tonight.event?.venue_id)?.name ?? null)
    : null;
  const heroTitle: React.ReactNode = tonight ? (
    <>
      {tonight.event?.name ?? "Tonight"}
      {tonightVenueName && (
        <>
          <br />
          at {tonightVenueName}
        </>
      )}
    </>
  ) : (
    RANGE_LABEL[range]
  );

  // ─── v5 4-up stat row ───
  const showRate =
    totalRsvpd > 0 ? Math.round((totalScanned / totalRsvpd) * 100) : 0;

  const isEmpty = nights.length === 0 && !tonight;

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      {isEmpty ? (
        // ─── v5 empty state — matches V5Empty ───
        (() => {
          const framing = dashboardFraming(account.account_type);
          const emptyTitle = q
            ? "Nothing matches"
            : range === "past"
              ? "No past events"
              : range === "upcoming"
                ? "Nothing booked"
                : framing.emptyTitle;
          const emptyBody = q
            ? `Nothing named "${q}". Try a different search or change the range.`
            : range === "past"
              ? "Once you run a night, the recap lands here."
              : framing.emptyBody;
          return (
            <div
              style={{
                padding: "var(--s-20) var(--s-8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--r-lg)",
                  background: "var(--bg-3)",
                  marginBottom: "var(--s-5)",
                }}
              />
              <div className="t-display-md">{emptyTitle}</div>
              <div
                className="t-body-2"
                style={{ marginTop: "var(--s-3)", maxWidth: 380 }}
              >
                {emptyBody}
              </div>
              {!q && range !== "past" && (
                <div
                  style={{
                    display: "flex",
                    gap: "var(--s-2)",
                    marginTop: "var(--s-6)",
                  }}
                >
                  <Link
                    href="/owner/events/new"
                    className="btn btn--accent"
                    style={{ textDecoration: "none" }}
                  >
                    {framing.emptyCtaLabel}
                  </Link>
                  <Link
                    href="/owner/calendar"
                    className="btn btn--ghost"
                    style={{ textDecoration: "none" }}
                  >
                    Open calendar
                  </Link>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <>
          {/* ─── CoverHeader hero ─── */}
          <CoverHeader
            seed={heroSeed}
            eyebrow={heroEyebrow}
            title={heroTitle}
            height={360}
            actions={
              <>
                <Link
                  href="/owner/calendar"
                  className="btn btn--ghost btn--lg"
                  style={{ textDecoration: "none" }}
                >
                  Calendar
                </Link>
                <Link
                  href={
                    tonight
                      ? `/owner/events/${tonight.event_id}?night=${tonight.id}`
                      : "/owner/events/new"
                  }
                  className="btn btn--lg btn--accent"
                  style={{ textDecoration: "none" }}
                >
                  {tonight ? "Open daydash" : "New event"}
                </Link>
              </>
            }
          />

          {/* ─── 4-up Stat row ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <Stat
              label="Doors"
              value={tonight ? fmtTime(tonight.doors_at) : "—"}
              sub={
                tonight
                  ? `${tonightStats?.approved ?? 0} on list`
                  : "no event today"
              }
            />
            <Stat
              label="RSVP'd"
              value={String(totalRsvpd)}
              sub={`across ${nights.length} night${nights.length === 1 ? "" : "s"}`}
            />
            <Stat
              label="Events"
              value={String(distinctEvents)}
              sub={RANGE_LABEL[range].toLowerCase()}
            />
            <Stat
              label="Live now"
              value={String(liveNow)}
              sub={`${totalScanned} checked in`}
              delta={showRate > 0 ? `${showRate}% show` : undefined}
              last
            />
          </div>

          {/* ─── Filters: search + range + venue ─── */}
          <div
            style={{
              padding: "var(--s-4) var(--s-8)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
              flexWrap: "wrap",
            }}
          >
            <form
              action="/owner"
              method="get"
              style={{ flex: 1, minWidth: 220 }}
            >
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search events…"
                className="input"
                style={{ maxWidth: 320 }}
              />
              {range !== "week" && (
                <input type="hidden" name="range" value={range} />
              )}
              {venueFilter && (
                <input type="hidden" name="venue" value={venueFilter} />
              )}
            </form>
            <div
              style={{
                display: "flex",
                gap: "var(--s-1)",
                marginLeft: "auto",
              }}
            >
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={rangeHref(r)}
                  className={
                    "nav-item " + (r === range ? "nav-item--active" : "")
                  }
                  style={{
                    textDecoration: "none",
                    fontSize: "var(--ts-sm)",
                  }}
                >
                  {RANGE_LABEL[r]}
                </Link>
              ))}
            </div>
          </div>
          {venues.length > 1 && (
            <div
              style={{
                padding: "var(--s-3) var(--s-8)",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                gap: "var(--s-1)",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={venueHref("")}
                className={
                  "nav-item " + (!venueFilter ? "nav-item--active" : "")
                }
                style={{ textDecoration: "none", fontSize: "var(--ts-sm)" }}
              >
                All venues
              </Link>
              {venues.map((v) => (
                <Link
                  key={v.id}
                  href={venueHref(v.id)}
                  className={
                    "nav-item " +
                    (venueFilter === v.id ? "nav-item--active" : "")
                  }
                  style={{
                    textDecoration: "none",
                    fontSize: "var(--ts-sm)",
                  }}
                >
                  {v.name}
                </Link>
              ))}
            </div>
          )}

          {/* ─── Upcoming · 3-col event card grid ─── */}
          {remainingNights.length > 0 && (
            <div style={{ padding: "var(--s-8)" }}>
              <div
                className="t-meta"
                style={{ marginBottom: "var(--s-4)" }}
              >
                {tonight ? "Upcoming" : RANGE_LABEL[range]} ·{" "}
                {remainingNights.length}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "var(--s-4)",
                }}
              >
                {remainingNights.map((n) => {
                  const s = statsFor(n.id);
                  const cap = n.capacity_cap ?? 0;
                  const name = n.event?.name ?? "—";
                  const linkHref =
                    range === "past"
                      ? `/owner/events/${n.event_id}/recap?night=${n.id}`
                      : `/owner/events/${n.event_id}?night=${n.id}`;
                  // Status chip mirrors V5Dashboard: scanned → ok,
                  // has list → info, otherwise draft/ghost.
                  let chipClass = "chip chip--ghost";
                  let chipLabel = "Draft";
                  if (s.scanned > 0) {
                    chipClass = "chip chip--ok";
                    chipLabel = "Live";
                  } else if (s.approved > 0) {
                    chipClass = "chip chip--info";
                    chipLabel = "On list";
                  } else if (n.is_frozen) {
                    chipClass = "chip chip--warn";
                    chipLabel = "Locked";
                  }
                  const countLabel = cap > 0 ? `${s.approved} / ${cap}` : `${s.approved}`;
                  return (
                    <Link
                      key={n.id}
                      href={linkHref}
                      className="card card--hover"
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <Cover seed={name} height={160}>
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
                            {fmtDate(n.night_date)}
                          </div>
                          <div
                            className="t-h1 truncate"
                            style={{
                              marginTop: "var(--s-1)",
                              color: "#fff",
                            }}
                          >
                            {name}
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
                        <span className="t-body-2 t-num">{countLabel}</span>
                        <span className={chipClass}>{chipLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!profile.tour_completed_at && !profile.tour_dismissed_at && (
        <OnboardingTour alreadySeeded={!!profile.demo_seeded_at} />
      )}
    </main>
  );
}

