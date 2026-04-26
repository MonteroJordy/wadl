import Link from "next/link";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import EmptyState from "@/components/empty-state";
import OnboardingTour from "@/components/onboarding-tour";

export const dynamic = "force-dynamic";

const RANGES = ["week", "month", "upcoming", "past"] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABEL: Record<Range, string> = {
  week: "This week",
  month: "This month",
  upcoming: "All upcoming",
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
  // past
  return { start: null, end: startOfDay };
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

  // List of this account's venues for the switcher.
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

  // Past = newest first; everything else = soonest first.
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
      supabase.from("guests").select("event_night_id, status").in("event_night_id", nightIds),
      supabase.from("check_ins").select("event_night_id, state").in("event_night_id", nightIds),
    ]);
    guests = (guestsRes.data ?? []) as GuestRow[];
    checkIns = (checkInsRes.data ?? []) as CheckInRow[];
  }

  function statsFor(nightId: string) {
    let approved = 0,
      pending = 0,
      scanned = 0;
    for (const g of guests) {
      if (g.event_night_id !== nightId) continue;
      if (g.status === "approved") approved++;
      else if (g.status === "pending") pending++;
    }
    for (const c of checkIns) {
      if (c.event_night_id !== nightId) continue;
      if (c.state === "approved") scanned++;
    }
    return { approved, pending, scanned };
  }

  const byDate = new Map<string, NightWithEvent[]>();
  for (const n of nights) {
    const key = n.night_date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(n);
  }

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
    <main id="main-content" className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <header className="flex items-start justify-between pb-4">
        <div>
          <p className="label-mono mb-1">{RANGE_LABEL[range]}</p>
          <h1 className="display-lg">{account.display_name}</h1>
        </div>
      </header>

      <Link href="/owner/events/new" className="btn-primary text-center mb-4 block">
        + Create event
      </Link>

      {venues.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
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

      <form action="/owner" method="get" className="mb-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by event name…"
          className="input-dark"
        />
        {range !== "week" && (
          <input type="hidden" name="range" value={range} />
        )}
        {venueFilter && (
          <input type="hidden" name="venue" value={venueFilter} />
        )}
      </form>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {RANGES.map((r) => {
          const active = r === range;
          return (
            <Link
              key={r}
              href={rangeHref(r)}
              className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                active
                  ? "border-coral bg-s2 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {RANGE_LABEL[r]}
            </Link>
          );
        })}
      </div>

      {byDate.size === 0 ? (
        <EmptyState
          title={
            q
              ? "No matches"
              : range === "past"
              ? "No past events yet"
              : range === "upcoming"
              ? "No upcoming events"
              : range === "month"
              ? "Nothing this month"
              : "No nights this week"
          }
          body={
            q
              ? `Nothing named "${q}". Try a different search or change the range.`
              : "Create an event to get your first guest list on the door."
          }
          action={
            !q && (
              <Link href="/owner/events/new" className="btn-primary inline-block">
                + Create event
              </Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {[...byDate.entries()].map(([date, ns]) => (
            <section key={date}>
              <p className="label-mono mb-2">{fmtDate(date)}</p>
              <div className="flex flex-col gap-2">
                {ns.map((n) => {
                  const s = statsFor(n.id);
                  const cap = n.capacity_cap ?? 0;
                  // Past nights jump straight to recap; current/upcoming go to daydash.
                  const linkHref =
                    range === "past"
                      ? `/owner/events/${n.event_id}/recap?night=${n.id}`
                      : `/owner/events/${n.event_id}?night=${n.id}`;
                  return (
                    <Link
                      key={n.id}
                      href={linkHref}
                      className="card hover:border-coral/60 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-sans text-cream font-semibold">
                            {n.event?.name}
                          </p>
                          <p className="label-mono mt-1">
                            Doors {fmtTime(n.doors_at)}
                            {n.is_frozen ? " · FROZEN" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-3xl leading-none text-cream">
                            {s.scanned}
                            <span className="text-muted">/{cap || "—"}</span>
                          </p>
                          <p className="label-mono mt-1">Scanned</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-4 label-mono">
                        <span>{s.approved} approved</span>
                        {s.pending > 0 && (
                          <span className="text-gold">{s.pending} pending</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="label-mono mt-8 text-center">
        {profile.full_name?.split(" ")[0]} · {account.account_type}
      </p>

      {!profile.tour_completed_at && !profile.tour_dismissed_at && (
        <OnboardingTour alreadySeeded={!!profile.demo_seeded_at} />
      )}
    </main>
  );
}
