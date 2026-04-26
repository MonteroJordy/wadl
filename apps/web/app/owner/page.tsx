import Link from "next/link";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import OnboardingTour from "@/components/onboarding-tour";
import { dashboardFraming } from "@wadl/shared/account-type";

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
  event: { id: string; name: string; flyer_url: string | null } | null;
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

function dayLabel(date: Date): { dow: string; day: string } {
  return {
    dow: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    day: String(date.getDate()),
  };
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

  const { data: venuesData } = await supabase
    .from("venues")
    .select("id, name")
    .eq("account_id", account.id)
    .order("name");
  const venues = (venuesData ?? []) as Array<{ id: string; name: string }>;

  let eventsQ = supabase
    .from("events")
    .select(
      "id, name, flyer_url, venue_id, event_nights(id, event_id, night_date, doors_at, capacity_cap, is_frozen)"
    )
    .eq("account_id", account.id);
  if (q) eventsQ = eventsQ.ilike("name", `%${q}%`);
  if (venueFilter) eventsQ = eventsQ.eq("venue_id", venueFilter);

  const { data: eventsData } = await eventsQ;

  const nights: NightWithEvent[] = [];
  for (const e of eventsData ?? []) {
    const ev = e as {
      id: string;
      name: string;
      flyer_url: string | null;
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
        event: { id: ev.id, name: ev.name, flyer_url: ev.flyer_url },
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
      : 1
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
    let approved = 0,
      pending = 0,
      scanned = 0,
      rsvps = 0;
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

  // Identify tonight's event (a night happening today).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tonight = nights.find((n) => {
    const d = new Date(n.doors_at);
    return isSameDay(d, today);
  });
  const tonightStats = tonight ? statsFor(tonight.id) : null;
  const remainingNights = nights.filter((n) => n !== tonight);

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

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 md:px-8 pt-6 pb-16"
    >
      {/* Hero strip — owner's current focus */}
      <header className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="label-mono mb-1">
            {RANGE_LABEL[range]} · {account.display_name}
            {account.handle && (
              <>
                {" · "}
                <span className="text-cream">@{account.handle}</span>
              </>
            )}
            {account.city && <> · {account.city}</>}
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-cream uppercase leading-[0.9] tracking-wide">
            {tonight ? "Tonight" : RANGE_LABEL[range]}
          </h1>
        </div>
        <Link
          href="/owner/events/new"
          className="shrink-0 inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
        >
          + New event
        </Link>
      </header>

      {/* Compact search + range tabs row */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center mb-3">
        <form action="/owner" method="get" className="flex-1">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search events…"
            className="w-full bg-s2 border border-line text-cream px-4 py-2.5 rounded-md font-sans text-sm placeholder:text-muted focus:border-coral focus:outline-none transition-colors"
          />
          {range !== "week" && (
            <input type="hidden" name="range" value={range} />
          )}
          {venueFilter && (
            <input type="hidden" name="venue" value={venueFilter} />
          )}
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <Link
                key={r}
                href={rangeHref(r)}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider transition ${
                  active
                    ? "border-coral bg-coral/10 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {RANGE_LABEL[r]}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Venue switcher pills */}
      {venues.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
          <Link
            href={venueHref("")}
            className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              !venueFilter
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            All venues
          </Link>
          {venues.map((v) => (
            <Link
              key={v.id}
              href={venueHref(v.id)}
              className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                venueFilter === v.id
                  ? "border-coral bg-s2 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {v.name}
            </Link>
          ))}
        </div>
      )}

      {/* TONIGHT hero card — coral gradient, big stats */}
      {tonight && tonightStats && (
        <Link
          href={`/owner/events/${tonight.event_id}?night=${tonight.id}`}
          className="group block relative overflow-hidden rounded-2xl mb-6 isolate"
        >
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(135deg, #FF4A2B 0%, #FF7A3C 55%, #c9351c 100%)",
            }}
          />
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 -z-10" />
          <div className="absolute -bottom-20 -left-12 w-64 h-64 rounded-full bg-white/5 -z-10" />

          {tonight.event?.flyer_url && (
            <div
              className="absolute inset-0 -z-20 opacity-50"
              style={{
                backgroundImage: `url(${tonight.event.flyer_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                Tonight · {fmtDate(tonight.night_date)}
              </p>
              <span className="inline-flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest text-white">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  style={{
                    boxShadow: "0 0 0 0 rgba(255,255,255,0.7)",
                    animation: "wadl-pulse 2s infinite",
                  }}
                />
                Live
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-6xl text-white uppercase leading-[0.9] tracking-wide mb-1">
              {tonight.event?.name}
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/70 mb-6">
              Doors {fmtTime(tonight.doors_at)}
              {tonight.is_frozen ? " · LOCKDOWN" : ""}
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              <div>
                <p className="font-display text-4xl md:text-5xl text-white leading-none">
                  {tonightStats.scanned}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-1">
                  In
                </p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl text-white/70 leading-none">
                  {tonightStats.pending}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-1">
                  Pending
                </p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl text-white leading-none">
                  {tonightStats.rsvps}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mt-1">
                  RSVPs
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 py-3 bg-black/20 border-t border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">
              Tap to open dashboard →
            </p>
          </div>
        </Link>
      )}

      {/* Coming up + past list */}
      {nights.length === 0 && !tonight ? (
        <section className="rounded-2xl border border-line bg-s1 px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral/10 border border-coral/30 mx-auto mb-5 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-coral"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          {(() => {
            const framing = dashboardFraming(account.account_type);
            return (
              <>
                <p className="font-display text-3xl text-cream uppercase tracking-wide mb-2">
                  {q
                    ? "Nothing matches"
                    : range === "past"
                    ? "No past events yet"
                    : range === "upcoming"
                    ? "Nothing booked"
                    : framing.emptyTitle}
                </p>
                <p className="text-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
                  {q
                    ? `Nothing named "${q}". Try a different search or change the range.`
                    : range === "past"
                    ? "Once you run a night, the recap lands here."
                    : framing.emptyBody}
                </p>
                {!q && range !== "past" && (
                  <Link
                    href="/owner/events/new"
                    className="inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
                  >
                    {framing.emptyCtaLabel}
                  </Link>
                )}
              </>
            );
          })()}
        </section>
      ) : remainingNights.length > 0 ? (
        <section className="mt-2">
          <p className="label-mono mb-3">
            {tonight ? "Coming up" : RANGE_LABEL[range]} · {remainingNights.length}
          </p>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {remainingNights.map((n) => {
              const s = statsFor(n.id);
              const cap = n.capacity_cap ?? 0;
              const date = new Date(n.doors_at);
              const lbl = dayLabel(date);
              const linkHref =
                range === "past"
                  ? `/owner/events/${n.event_id}/recap?night=${n.id}`
                  : `/owner/events/${n.event_id}?night=${n.id}`;
              return (
                <Link
                  key={n.id}
                  href={linkHref}
                  className="card hover:border-coral/60 transition group flex gap-4 items-start p-4"
                >
                  <div className="w-12 shrink-0 bg-s2 border border-line rounded-md py-2 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      {lbl.dow}
                    </p>
                    <p className="font-display text-2xl text-cream leading-none mt-0.5">
                      {lbl.day}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans font-semibold text-cream truncate group-hover:text-coral transition">
                      {n.event?.name ?? "—"}
                    </p>
                    <p className="label-mono mt-1">
                      Doors {fmtTime(n.doors_at)}
                      {n.is_frozen ? " · LOCKED" : ""}
                    </p>
                    <div className="mt-3 flex gap-3 label-mono">
                      <span className="text-cream">
                        {s.scanned}
                        {cap > 0 && (
                          <span className="text-muted">/{cap}</span>
                        )}
                      </span>
                      <span>·</span>
                      <span>{s.approved} approved</span>
                      {s.pending > 0 && (
                        <span className="text-gold">{s.pending} pending</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <style>{`
        @keyframes wadl-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>

      {!profile.tour_completed_at && !profile.tour_dismissed_at && (
        <OnboardingTour alreadySeeded={!!profile.demo_seeded_at} />
      )}
    </main>
  );
}
