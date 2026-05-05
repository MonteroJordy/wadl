import Link from "next/link";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import OnboardingTour from "@/components/onboarding-tour";
import { dashboardFraming } from "@wadl/shared/account-type";
import {
  Avatar,
  CapacityMeter,
  Chip,
  IconArrow,
  IconPlus,
} from "@/components/wadl";

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
    dow: date
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase(),
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
      "id, name, flyer_url, venue_id, event_nights(id, event_id, night_date, doors_at, capacity_cap, is_frozen)",
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

  const tonightLabel = tonight
    ? `${fmtDate(tonight.night_date)} · ${tonight.event?.name ?? "—"}`
    : `${RANGE_LABEL[range]} · ${account.display_name}`;

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header — BizHome style */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="w-type-meta">
              {tonightLabel.toUpperCase()}
              {account.handle ? ` · @${account.handle}` : ""}
              {account.city ? ` · ${account.city}` : ""}
            </div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              {tonight ? "Tonight at the door" : RANGE_LABEL[range]}
            </div>
          </div>
          <Link
            href="/owner/events/new"
            className="w-btn w-btn--primary"
            style={{ textDecoration: "none" }}
          >
            <IconPlus /> New event
          </Link>
        </div>

        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 28,
          }}
        >
          <KPI
            eyebrow="DOORS"
            big={tonight ? fmtTime(tonight.doors_at) : "—"}
            sub={tonight ? "tonight" : "no event today"}
            accent={Boolean(tonight)}
          />
          <KPI
            eyebrow="RSVP'D"
            big={String(totalRsvpd)}
            sub={`across ${nights.length} night${nights.length === 1 ? "" : "s"}`}
          />
          <KPI
            eyebrow="EVENTS"
            big={String(distinctEvents)}
            sub={`${RANGE_LABEL[range].toLowerCase()}`}
          />
          <KPI
            eyebrow="LIVE NOW"
            big={String(liveNow)}
            sub={`${totalScanned} checked in`}
            accent={liveNow > 0}
          />
        </div>

        {/* Filter row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 28,
            paddingBottom: 14,
            borderBottom: "1px solid var(--w-line)",
            flexWrap: "wrap",
          }}
        >
          <form action="/owner" method="get" style={{ flex: 1, minWidth: 220 }}>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="search events…"
              className="w-input"
              style={{ height: 36, fontSize: 13 }}
            />
            {range !== "week" && (
              <input type="hidden" name="range" value={range} />
            )}
            {venueFilter && (
              <input type="hidden" name="venue" value={venueFilter} />
            )}
          </form>
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <Link
                key={r}
                href={rangeHref(r)}
                style={{
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <Chip tone={active ? "neutral" : "ghost"}>
                  {RANGE_LABEL[r].toUpperCase()}
                </Chip>
              </Link>
            );
          })}
        </div>

        {/* Venue pills */}
        {venues.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <Link href={venueHref("")} style={{ textDecoration: "none" }}>
              <Chip tone={!venueFilter ? "neutral" : "ghost"}>
                ALL VENUES
              </Chip>
            </Link>
            {venues.map((v) => (
              <Link
                key={v.id}
                href={venueHref(v.id)}
                style={{ textDecoration: "none" }}
              >
                <Chip tone={venueFilter === v.id ? "neutral" : "ghost"}>
                  {v.name.toUpperCase()}
                </Chip>
              </Link>
            ))}
          </div>
        )}

        {/* TONIGHT hero card */}
        {tonight && tonightStats && (
          <Link
            href={`/owner/events/${tonight.event_id}?night=${tonight.id}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              marginTop: 28,
            }}
          >
            <div
              className="w-card"
              style={{
                padding: 0,
                overflow: "hidden",
                borderColor: "var(--w-acc)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  padding: 28,
                  background:
                    "linear-gradient(135deg, oklch(0.7 0.24 260) 0%, oklch(0.55 0.22 280) 100%)",
                  color: "var(--w-acc-ink)",
                }}
              >
                {tonight.event?.flyer_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tonight.event.flyer_url}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: 0.32,
                      }}
                    />
                  </>
                )}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      className="w-type-meta"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      TONIGHT · {fmtDate(tonight.night_date).toUpperCase()}
                    </span>
                    <Chip tone="acc" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <span
                        className="w-pulse"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: "currentColor",
                        }}
                      />
                      LIVE
                    </Chip>
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(40px, 5vw, 64px)",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 0.92,
                      marginTop: 16,
                      fontFamily: "var(--w-display)",
                    }}
                  >
                    {tonight.event?.name}
                  </div>
                  <div
                    className="w-type-meta"
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      marginTop: 8,
                    }}
                  >
                    DOORS {fmtTime(tonight.doors_at)}
                    {tonight.is_frozen ? " · LOCKDOWN" : ""}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                      marginTop: 28,
                      maxWidth: 460,
                    }}
                  >
                    <BigStat
                      n={tonightStats.scanned}
                      label="IN"
                    />
                    <BigStat
                      n={tonightStats.pending}
                      label="PENDING"
                      muted
                    />
                    <BigStat
                      n={tonightStats.rsvps}
                      label="RSVPS"
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  background: "rgba(0,0,0,0.25)",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  className="w-type-meta"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  TAP TO OPEN DASHBOARD →
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Empty / list */}
        {nights.length === 0 && !tonight ? (
          <section
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 28,
            }}
          >
            {(() => {
              const framing = dashboardFraming(account.account_type);
              return (
                <>
                  <div className="w-type-h1">
                    {q
                      ? "Nothing matches"
                      : range === "past"
                        ? "No past events"
                        : range === "upcoming"
                          ? "Nothing booked"
                          : framing.emptyTitle}
                  </div>
                  <p
                    className="w-type-body-sm"
                    style={{
                      color: "var(--w-fg-muted)",
                      marginTop: 12,
                      maxWidth: 480,
                      marginInline: "auto",
                    }}
                  >
                    {q
                      ? `Nothing named "${q}". Try a different search or change the range.`
                      : range === "past"
                        ? "Once you run a night, the recap lands here."
                        : framing.emptyBody}
                  </p>
                  {!q && range !== "past" && (
                    <Link
                      href="/owner/events/new"
                      className="w-btn w-btn--primary"
                      style={{
                        marginTop: 24,
                        textDecoration: "none",
                        display: "inline-flex",
                      }}
                    >
                      <IconPlus /> {framing.emptyCtaLabel}
                    </Link>
                  )}
                </>
              );
            })()}
          </section>
        ) : remainingNights.length > 0 ? (
          <section style={{ marginTop: 32 }}>
            <div className="w-type-meta" style={{ marginBottom: 14 }}>
              {tonight ? "COMING UP" : RANGE_LABEL[range].toUpperCase()} ·{" "}
              {remainingNights.length}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
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
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      className="w-card"
                      style={{
                        padding: 16,
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          flexShrink: 0,
                          background: "#ffffff08",
                          borderRadius: 0,
                          padding: "8px 0",
                          textAlign: "center",
                          fontFamily: "var(--w-mono)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--w-fg-muted)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {lbl.dow}
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            marginTop: 2,
                          }}
                        >
                          {lbl.day}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.event?.name ?? "—"}
                        </div>
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4 }}
                        >
                          DOORS {fmtTime(n.doors_at)}
                          {n.is_frozen ? " · LOCKED" : ""}
                        </div>
                        {cap > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <CapacityMeter
                              current={s.scanned}
                              total={cap}
                              accent
                              label="CHECKED IN"
                            />
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <Chip tone="neutral">
                            {s.approved} APPROVED
                          </Chip>
                          {s.pending > 0 && (
                            <Chip tone="warn">
                              {s.pending} PENDING
                            </Chip>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          color: "var(--w-fg-dim)",
                          marginTop: 4,
                        }}
                      >
                        <IconArrow />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      {!profile.tour_completed_at && !profile.tour_dismissed_at && (
        <OnboardingTour alreadySeeded={!!profile.demo_seeded_at} />
      )}
    </main>
  );
}

function KPI({
  eyebrow,
  big,
  sub,
  delta,
  pos,
  accent,
}: {
  eyebrow: string;
  big: string;
  sub?: string;
  delta?: string;
  pos?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="w-card"
      style={{
        padding: 20,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{eyebrow}</div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginTop: 6,
          fontFamily: "var(--w-display)",
          lineHeight: 1,
        }}
      >
        {big}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 10,
          gap: 8,
        }}
      >
        {sub && (
          <span
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            {sub}
          </span>
        )}
        {delta && (
          <span
            style={{
              fontFamily: "var(--w-mono)",
              fontSize: 11,
              color: pos ? "var(--w-ok)" : "var(--w-acc)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function BigStat({
  n,
  label,
  muted,
}: {
  n: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.035em",
          lineHeight: 0.94,
          color: muted ? "rgba(255,255,255,0.7)" : "currentColor",
        }}
      >
        {n}
      </div>
      <div
        className="w-type-meta"
        style={{
          color: "rgba(255,255,255,0.7)",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}
