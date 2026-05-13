import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import { fmtHour } from "@/lib/recap";
import FreezeButton from "./freeze-button";
import EmptyState from "@/components/empty-state";
import RealtimeCounters from "@/components/realtime-counters";
import ActivityFeedRealtime from "@/components/activity-feed-realtime";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Button,
  CapacityMeter,
  Chip,
  IconArrow,
} from "@/components/wadl";
import { DesktopOnly, MobileOnly } from "@/components/responsive";

export const dynamic = "force-dynamic";

interface CheckInRow {
  state: string;
  scanned_at: string;
  guest: {
    plus_ones: number;
    allocation_id: string | null;
    allocation: { holder_name: string } | null;
  } | null;
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export default async function DayDashPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, description, flyer_url, event_type, venue_id, account_id, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct, is_frozen)",
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!event) notFound();

  const nights = (event.event_nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
    cutoff_at: string | null;
    capacity_cap: number | null;
    lockdown_threshold_pct: number;
    is_frozen: boolean;
  }>;
  nights.sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  if (nights.length === 0) {
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
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link
            href="/owner"
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {event.name}
          </div>
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <div className="w-type-h1">No nights yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 420,
                marginInline: "auto",
              }}
            >
              Add a night from settings to start building the list.
            </p>
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Go to settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Active night.
  const now = Date.now();
  const upcoming = nights.find((n) => new Date(n.doors_at).getTime() >= now);
  const defaultNight = upcoming ?? nights[0];
  const active =
    nights.find((n) => n.id === searchParams.night) ?? defaultNight;

  // Live analytics fetch. We pull guests once and derive pending counts in
  // memory — the previous version did a separate count(*) for pending,
  // which was a redundant round-trip on every daydash render.
  const [guestsRes, checkInsRes, allocRes] = await Promise.all([
    supabase
      .from("guests")
      .select("status, plus_ones")
      .eq("event_night_id", active.id),
    supabase
      .from("check_ins")
      .select(
        "state, scanned_at, guest:guests!inner(plus_ones, allocation_id, allocation:allocations(holder_name))",
      )
      .eq("event_night_id", active.id),
    supabase
      .from("allocations")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", active.id),
  ]);

  const guests = (guestsRes.data ?? []) as Array<{
    status: string;
    plus_ones: number;
  }>;
  const approvedHeads = guests
    .filter((g) => g.status === "approved")
    .reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);
  const pendingHeads = guests
    .filter((g) => g.status === "pending")
    .reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);

  const checkIns = (checkInsRes.data ?? []) as unknown as CheckInRow[];
  const approvedScans = checkIns.filter((c) => c.state === "approved");

  let scanned = 0;
  const holderScans = new Map<string, { name: string; count: number }>();
  const hourCounts = new Map<number, number>();
  let lastScanAt: string | null = null;

  for (const c of approvedScans) {
    const heads = 1 + (c.guest?.plus_ones ?? 0);
    scanned += heads;
    const hour = new Date(c.scanned_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + heads);
    if (!lastScanAt || c.scanned_at > lastScanAt) lastScanAt = c.scanned_at;
    if (c.guest?.allocation_id) {
      const key = c.guest.allocation_id;
      if (!holderScans.has(key)) {
        holderScans.set(key, {
          name: c.guest.allocation?.holder_name ?? "—",
          count: 0,
        });
      }
      holderScans.get(key)!.count += heads;
    }
  }

  const recentScans = approvedScans.filter(
    (c) => Date.now() - new Date(c.scanned_at).getTime() < 30 * 60_000,
  ).length;

  const topHolderEntry = [...holderScans.values()].sort(
    (a, b) => b.count - a.count,
  )[0];

  const currentHour = new Date().getHours();
  const earliestHour =
    hourCounts.size > 0 ? Math.min(...hourCounts.keys()) : currentHour;
  const hours: Array<{ hour: number; count: number }> = [];
  for (let h = earliestHour; h <= currentHour; h++) {
    hours.push({ hour: h % 24, count: hourCounts.get(h) ?? 0 });
  }
  const peakHourCount = Math.max(1, ...hours.map((h) => h.count));

  const cap = active.capacity_cap ?? 0;
  const pctFull = cap > 0 ? Math.round((scanned / cap) * 100) : 0;
  const totalList = approvedHeads + pendingHeads;
  const allocCount = allocRes.count ?? 0;
  const pendingCount = guests.filter((g) => g.status === "pending").length;

  return (
    <>

      {/* ============================ DESKTOP ============================ */}
      <main
        id="main-content"
        className="w-app dd-desktop"
        style={{ minHeight: "100vh", background: "var(--w-bg)" }}
      >
        <div className="dd-desk-frame">
          {/* Top toolbar — breadcrumb, night picker, live, settings. */}
          <div className="dd-desk-toolbar">
            <Link
              href="/owner"
              className="w-type-meta"
              style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
            >
              EVENTS /
            </Link>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.01em",
              }}
            >
              {event.name}
            </div>
            <div
              className="w-type-meta"
              style={{ color: "var(--w-fg-muted)" }}
            >
              {fmtDate(active.night_date).toUpperCase()} · DOORS{" "}
              {fmtTime(active.doors_at).toUpperCase()}
              {active.is_frozen ? " · FROZEN" : ""}
            </div>
            {nights.length > 1 && (
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                {nights.map((n) => {
                  const isActive = n.id === active.id;
                  return (
                    <Link
                      key={n.id}
                      href={`/owner/events/${event.id}?night=${n.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Chip tone={isActive ? "neutral" : "ghost"}>
                        {fmtDate(n.night_date).toUpperCase()}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <RealtimeCounters nightId={active.id} />
              <Link
                href={`/owner/events/${event.id}/settings`}
                className="w-type-meta"
                style={{
                  textDecoration: "none",
                  padding: "6px 10px",
                  border: "1px solid var(--w-line)",
                  color: "var(--w-fg-muted)",
                }}
              >
                SETTINGS
              </Link>
            </div>
          </div>

          {/* 3-pane main grid */}
          <div className="dd-desk-grid">
            {/* LEFT: stats stack */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                className="w-card"
                style={{ padding: 18 }}
              >
                <div className="w-type-meta">SCANNED IN</div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontSize: 56,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.92,
                    marginTop: 4,
                  }}
                >
                  {scanned}
                  <span style={{ color: "var(--w-fg-dim)", fontSize: 28 }}>
                    /{cap || "—"}
                  </span>
                </div>
                <div
                  className="w-type-meta"
                  style={{ marginTop: 6, color: "var(--w-acc)" }}
                >
                  {pctFull}% FULL
                </div>
                {cap > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <CapacityMeter current={scanned} total={cap} accent />
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--w-line)",
                  }}
                >
                  <div>
                    <div className="w-type-meta">APPROVED</div>
                    <div
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 22,
                        marginTop: 2,
                      }}
                    >
                      {approvedHeads}
                    </div>
                  </div>
                  <div>
                    <div className="w-type-meta">PENDING</div>
                    <div
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 22,
                        marginTop: 2,
                        color:
                          pendingHeads > 0 ? "var(--w-warn)" : "var(--w-fg)",
                      }}
                    >
                      {pendingHeads}
                    </div>
                  </div>
                  <div>
                    <div className="w-type-meta">ALLOCS</div>
                    <div
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 22,
                        marginTop: 2,
                      }}
                    >
                      {allocCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent scan / pace mini stats */}
              {scanned > 0 && (
                <div className="w-card" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <MiniStat
                      label="LAST SCAN"
                      value={lastScanAt ? ago(lastScanAt) : "—"}
                    />
                    <MiniStat label="LAST 30M" value={`${recentScans}`} />
                    {(() => {
                      if (!cap || cap <= 0)
                        return <MiniStat label="CAP" value="—" tone="muted" />;
                      if (scanned >= cap)
                        return (
                          <MiniStat label="AT CAP" value="Now" tone="err" />
                        );
                      if (recentScans <= 0)
                        return (
                          <MiniStat label="PACE" value="—" tone="muted" />
                        );
                      const perMin = recentScans / 30;
                      const remaining = cap - scanned;
                      const eta = Math.round(remaining / perMin);
                      const tone =
                        eta <= 30 ? "err" : eta <= 90 ? "warn" : "ok";
                      return (
                        <MiniStat
                          label="CAP IN"
                          tone={tone}
                          value={
                            eta < 60
                              ? `~${eta}m`
                              : `~${Math.floor(eta / 60)}h ${eta % 60}m`
                          }
                        />
                      );
                    })()}
                    <MiniStat
                      label="ON LIST"
                      value={`${totalList}`}
                    />
                  </div>
                </div>
              )}

              {topHolderEntry && (
                <div className="w-card" style={{ padding: 14 }}>
                  <div className="w-type-meta">TOP HOLDER</div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      marginTop: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {topHolderEntry.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--w-mono)",
                      fontSize: 13,
                      color: "var(--w-ok)",
                      marginTop: 2,
                    }}
                  >
                    {topHolderEntry.count} scanned
                  </div>
                </div>
              )}

              {hours.length > 0 && scanned > 0 && (
                <div className="w-card" style={{ padding: 14 }}>
                  <div className="w-type-meta">ARRIVALS BY HOUR</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 3,
                      height: 64,
                      marginTop: 10,
                    }}
                  >
                    {hours.map((b) => {
                      const h = (b.count / peakHourCount) * 100;
                      const isPeak =
                        b.count > 0 && b.count === peakHourCount;
                      return (
                        <div
                          key={b.hour}
                          style={{
                            flex: 1,
                            height: `${Math.max(4, h)}%`,
                            background: isPeak
                              ? "var(--w-acc)"
                              : "oklch(0.86 0.18 145 / 0.6)",
                          }}
                          title={`${fmtHour(b.hour)}: ${b.count}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <FreezeButton
                eventId={event.id}
                nightId={active.id}
                frozen={active.is_frozen}
              />
            </aside>

            {/* CENTER: actions + queue + tertiary */}
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Setup nudge inline */}
              {allocCount === 0 && approvedHeads === 0 && (
                <div
                  className="w-card"
                  style={{
                    padding: 18,
                    borderColor: "var(--w-acc)",
                    background: "var(--w-acc-soft)",
                  }}
                >
                  <div
                    className="w-type-meta"
                    style={{ color: "var(--w-acc-ink)" }}
                  >
                    SET UP YOUR LIST
                  </div>
                  <div
                    style={{ fontWeight: 700, fontSize: 18, marginTop: 6 }}
                  >
                    No allocations yet
                  </div>
                  <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                    An allocation is a slice of your door given to a promoter
                    or partner. They get a magic link, add guests up to their
                    cap, and you see who added whom — no accounts on their
                    end.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <Link
                      href={`/owner/events/${event.id}/allocations/new`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button variant="primary" block>
                        Add allocation
                      </Button>
                    </Link>
                    <Link
                      href={`/owner/events/${event.id}/staff`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button variant="ghost" block>
                        Invite door staff
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Pending queue banner — desktop puts it FRONT */}
              {pendingCount > 0 && (
                <Link
                  href={`/owner/events/${event.id}/queue`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="w-card"
                    style={{
                      padding: 18,
                      borderColor: "var(--w-warn)",
                      background:
                        "linear-gradient(90deg, oklch(0.86 0.16 85 / 0.10), transparent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        className="w-type-meta"
                        style={{ color: "var(--w-warn)" }}
                      >
                        APPROVAL QUEUE
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--w-display)",
                          fontWeight: 700,
                          fontSize: 26,
                          marginTop: 4,
                        }}
                      >
                        {pendingCount}{" "}
                        <span
                          style={{
                            color: "var(--w-fg-muted)",
                            fontSize: 14,
                            fontWeight: 400,
                          }}
                        >
                          waiting · {pendingHeads} heads
                        </span>
                      </div>
                    </div>
                    <Button variant="primary">Review now →</Button>
                  </div>
                </Link>
              )}

              {/* Action grid — denser on desktop, 4 columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {[
                  {
                    href: `/owner/events/${event.id}/allocations`,
                    eyebrow: "LIST",
                    label: "Promoter lists",
                    badge: allocCount > 0 ? `${allocCount}` : undefined,
                  },
                  {
                    href: `/door/events/${event.id}?night=${active.id}`,
                    eyebrow: "LIVE",
                    label: "Open the door",
                    ok: true,
                  },
                  {
                    href: `/owner/events/${event.id}/staff`,
                    eyebrow: "TEAM",
                    label: "Door staff",
                  },
                  {
                    href: `/owner/events/${event.id}/co-owners`,
                    eyebrow: "SHARE",
                    label: "Add a co-host",
                  },
                  {
                    href: `/owner/events/${event.id}/chathub`,
                    eyebrow: "AI",
                    label: "Paste names",
                  },
                  {
                    href: `/owner/events/${event.id}/waitlist`,
                    eyebrow: "BACKUP",
                    label: "Waitlist",
                  },
                  {
                    href: `/owner/events/${event.id}/scorecards`,
                    eyebrow: "RANK",
                    label: "Promoter scores",
                  },
                  {
                    href: `/owner/events/${event.id}/recap?night=${active.id}`,
                    eyebrow: "AFTER",
                    label: "Event recap",
                  },
                ].map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      className="w-card"
                      style={{
                        padding: 12,
                        minHeight: 72,
                        borderColor: c.ok
                          ? "oklch(0.86 0.18 145 / 0.5)"
                          : "var(--w-line)",
                      }}
                    >
                      <div
                        className="w-type-meta"
                        style={{
                          color: c.ok
                            ? "var(--w-ok)"
                            : "var(--w-fg-muted)",
                        }}
                      >
                        {c.eyebrow}
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginTop: 4,
                          color: c.ok ? "var(--w-ok)" : "var(--w-fg)",
                        }}
                      >
                        {c.label}
                      </div>
                      {c.badge && (
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 4 }}
                        >
                          {c.badge}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Toolbox — full width tight strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 0,
                  border: "1px solid var(--w-line)",
                  background: "var(--w-surface-2)",
                }}
              >
                {[
                  ["EXPORT CSV", `/owner/events/${event.id}/export`],
                  ["EXPORT PDF", `/owner/events/${event.id}/export/pdf`],
                  ["PRINT", `/owner/events/${event.id}/print`],
                  ["CLONE", `/owner/events/${event.id}/clone`],
                  ["IMPORT", `/owner/events/${event.id}/guests/import`],
                  ["BROADCAST", `/owner/events/${event.id}/broadcast`],
                  ["TEMPLATES", `/owner/events/${event.id}/template`],
                  ["AUDIT", `/owner/events/${event.id}/audit`],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="w-type-meta"
                    style={{
                      textDecoration: "none",
                      padding: "10px 12px",
                      borderRight: "1px solid var(--w-line)",
                      color: "var(--w-fg-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  href={`/owner/events/${event.id}/override`}
                  className="w-type-meta"
                  style={{
                    textDecoration: "none",
                    padding: "10px 12px",
                    color: "var(--w-err)",
                    whiteSpace: "nowrap",
                  }}
                >
                  OVERRIDE ADMIT
                </Link>
              </div>

              {totalList === 0 && (
                <EmptyState
                  title="No guests yet"
                  body="Invite a promoter or share the discovery page to start the list."
                />
              )}
            </section>

            {/* RIGHT: live activity rail */}
            <aside className="dd-desk-rail">
              {await renderActivity(active.id, event.id)}
            </aside>
          </div>
        </div>
      </main>

      {/* ============================ MOBILE ============================ */}
      <main
        id="main-content-mobile"
        className="w-app dd-mobile"
        style={{ minHeight: "100vh", background: "var(--w-bg)" }}
      >
        <div className="dd-mob-frame">
          {/* Sticky compact header */}
          <header className="dd-mob-header">
            <Link
              href="/owner"
              aria-label="Back"
              style={{
                color: "var(--w-fg)",
                textDecoration: "none",
                fontSize: 22,
                lineHeight: 1,
                width: 32,
              }}
            >
              ←
            </Link>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {event.name}
              </div>
              <div
                className="w-type-meta"
                style={{ color: "var(--w-fg-muted)", marginTop: 2 }}
              >
                {fmtDate(active.night_date).toUpperCase()} · DOORS{" "}
                {fmtTime(active.doors_at).toUpperCase()}
              </div>
            </div>
            <RealtimeCounters nightId={active.id} />
          </header>

          <div className="dd-mob-body">
            {/* Multi-night picker */}
            {nights.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  marginBottom: 4,
                }}
              >
                {nights.map((n) => {
                  const isActive = n.id === active.id;
                  return (
                    <Link
                      key={n.id}
                      href={`/owner/events/${event.id}?night=${n.id}`}
                      style={{ textDecoration: "none", flexShrink: 0 }}
                    >
                      <Chip tone={isActive ? "neutral" : "ghost"}>
                        {fmtDate(n.night_date).toUpperCase()}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* HUGE stat hero — fills the viewport top */}
            <div
              className="w-card"
              style={{
                padding: 24,
                borderColor: pctFull >= 90 ? "var(--w-err)" : "var(--w-acc)",
                background:
                  pctFull >= 90 ? "transparent" : "var(--w-acc-soft)",
              }}
            >
              <div className="w-type-meta">SCANNED IN</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontSize: "clamp(64px, 18vw, 96px)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.92,
                  marginTop: 4,
                  color:
                    pctFull >= 90 ? "var(--w-err)" : "var(--w-acc-ink)",
                }}
              >
                {scanned}
                <span
                  style={{
                    color: "var(--w-fg-dim)",
                    fontSize: "0.5em",
                  }}
                >
                  /{cap || "—"}
                </span>
              </div>
              <div
                className="w-type-meta"
                style={{
                  marginTop: 6,
                  color:
                    pctFull >= 90 ? "var(--w-err)" : "var(--w-acc-ink)",
                  fontWeight: 600,
                }}
              >
                {pctFull}% FULL{active.is_frozen ? " · FROZEN" : ""}
              </div>
              {cap > 0 && (
                <div style={{ marginTop: 14 }}>
                  <CapacityMeter current={scanned} total={cap} accent />
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop:
                    pctFull >= 90
                      ? "1px solid var(--w-line)"
                      : "1px solid rgba(0,0,0,0.18)",
                }}
              >
                <div>
                  <div className="w-type-meta">APPROVED</div>
                  <div
                    style={{
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 22,
                      marginTop: 2,
                    }}
                  >
                    {approvedHeads}
                  </div>
                </div>
                <div>
                  <div className="w-type-meta">PENDING</div>
                  <div
                    style={{
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 22,
                      marginTop: 2,
                      color:
                        pendingHeads > 0 ? "var(--w-warn)" : "inherit",
                    }}
                  >
                    {pendingHeads}
                  </div>
                </div>
                <div>
                  <div className="w-type-meta">ALLOCS</div>
                  <div
                    style={{
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 22,
                      marginTop: 2,
                    }}
                  >
                    {allocCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Pending banner — full-width tap target */}
            {pendingCount > 0 && (
              <Link
                href={`/owner/events/${event.id}/queue`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-card"
                  style={{
                    padding: 18,
                    borderColor: "var(--w-warn)",
                    background: "var(--w-surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      className="w-type-meta"
                      style={{ color: "var(--w-warn)" }}
                    >
                      APPROVAL QUEUE
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 24,
                        marginTop: 2,
                      }}
                    >
                      {pendingCount} waiting
                    </div>
                  </div>
                  <span
                    style={{
                      color: "var(--w-warn)",
                      fontSize: 24,
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                </div>
              </Link>
            )}

            {/* Big-touch action grid — primary 4 in 2x2 */}
            <div className="dd-mob-actions">
              {[
                {
                  href: `/door/events/${event.id}?night=${active.id}`,
                  eyebrow: "LIVE",
                  label: "Open the door",
                  ok: true,
                },
                {
                  href: `/owner/events/${event.id}/allocations`,
                  eyebrow: "LIST",
                  label: "Promoter lists",
                  badge: allocCount > 0 ? `${allocCount}` : undefined,
                },
                {
                  href: `/owner/events/${event.id}/chathub`,
                  eyebrow: "AI",
                  label: "Paste names",
                },
                {
                  href: `/owner/events/${event.id}/staff`,
                  eyebrow: "TEAM",
                  label: "Door staff",
                },
              ].map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="dd-mob-action"
                  style={{
                    borderColor: c.ok
                      ? "oklch(0.86 0.18 145 / 0.5)"
                      : "var(--w-line)",
                  }}
                >
                  <div
                    className="w-type-meta"
                    style={{
                      color: c.ok ? "var(--w-ok)" : "var(--w-fg-muted)",
                    }}
                  >
                    {c.eyebrow}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 17,
                      color: c.ok ? "var(--w-ok)" : "var(--w-fg)",
                    }}
                  >
                    {c.label}
                  </div>
                  {c.badge && (
                    <div className="w-type-meta">{c.badge}</div>
                  )}
                </Link>
              ))}
            </div>

            {/* Secondary actions row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Link
                href={`/owner/events/${event.id}/scorecards`}
                style={{ textDecoration: "none" }}
              >
                <Button variant="ghost" block>
                  Promoter scores
                </Button>
              </Link>
              <Link
                href={`/owner/events/${event.id}/recap?night=${active.id}`}
                style={{ textDecoration: "none" }}
              >
                <Button variant="ghost" block>
                  Recap
                </Button>
              </Link>
            </div>

            <FreezeButton
              eventId={event.id}
              nightId={active.id}
              frozen={active.is_frozen}
            />

            {/* Hour bars (full bleed-ish) */}
            {hours.length > 0 && scanned > 0 && (
              <div className="w-card" style={{ padding: 14 }}>
                <div className="w-type-meta">ARRIVALS BY HOUR</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 80,
                    marginTop: 12,
                  }}
                >
                  {hours.map((b) => {
                    const h = (b.count / peakHourCount) * 100;
                    const isPeak =
                      b.count > 0 && b.count === peakHourCount;
                    return (
                      <div
                        key={b.hour}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            flex: 1,
                            display: "flex",
                            alignItems: "flex-end",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: `${Math.max(4, h)}%`,
                              background: isPeak
                                ? "var(--w-acc)"
                                : "oklch(0.86 0.18 145 / 0.6)",
                            }}
                          />
                        </div>
                        <div
                          className="w-type-meta"
                          style={{ fontSize: 9 }}
                        >
                          {fmtHour(b.hour)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {topHolderEntry && (
              <div className="w-card" style={{ padding: 14 }}>
                <div className="w-type-meta">TOP HOLDER</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginTop: 6,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {topHolderEntry.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--w-mono)",
                      fontWeight: 600,
                      color: "var(--w-ok)",
                    }}
                  >
                    {topHolderEntry.count}
                  </div>
                </div>
              </div>
            )}

            {/* More tools — collapsed */}
            <details>
              <summary
                className="w-type-meta"
                style={{
                  padding: "12px 0",
                  cursor: "pointer",
                  color: "var(--w-fg-muted)",
                }}
              >
                MORE TOOLS ▾
              </summary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {[
                  ["Waitlist", `/owner/events/${event.id}/waitlist`],
                  ["Co-owners", `/owner/events/${event.id}/co-owners`],
                  ["Audit log", `/owner/events/${event.id}/audit`],
                  ["Broadcast", `/owner/events/${event.id}/broadcast`],
                  ["Import CSV", `/owner/events/${event.id}/guests/import`],
                  ["Templates", `/owner/events/${event.id}/template`],
                  ["Print", `/owner/events/${event.id}/print`],
                  ["Settings", `/owner/events/${event.id}/settings`],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    style={{ textDecoration: "none" }}
                  >
                    <Button variant="ghost" block style={{ fontSize: 13 }}>
                      {label}
                    </Button>
                  </Link>
                ))}
                <Link
                  href={`/owner/events/${event.id}/override`}
                  style={{ textDecoration: "none", gridColumn: "1 / -1" }}
                >
                  <Button
                    variant="ghost"
                    block
                    style={{
                      borderColor: "var(--w-err)",
                      color: "var(--w-err)",
                      fontSize: 13,
                    }}
                  >
                    ⚠ Override admit
                  </Button>
                </Link>
              </div>
            </details>

            {/* Activity feed at the bottom */}
            {await renderActivity(active.id, event.id)}
          </div>
        </div>
      </main>
    </>
  );
}


function BigStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
}) {
  const color =
    tone === "warn" && value > 0 ? "var(--w-warn)" : "var(--w-fg)";
  return (
    <div>
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 6,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "err" | "muted";
}) {
  const color =
    tone === "ok"
      ? "var(--w-ok)"
      : tone === "warn"
        ? "var(--w-warn)"
        : tone === "err"
          ? "var(--w-err)"
          : tone === "muted"
            ? "var(--w-fg-muted)"
            : "var(--w-fg)";
  return (
    <div>
      <div className="w-type-meta" style={{ color }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--w-mono)",
          fontSize: 14,
          fontWeight: 500,
          marginTop: 4,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface ActionCell {
  href: string;
  eyebrow: string;
  label: string;
  badge?: string;
  accent?: boolean;
  ok?: boolean;
}

function ActionGrid({ rows }: { rows: ActionCell[][] }) {
  return (
    <div
      style={{
        marginTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${row.length}, 1fr)`,
            gap: 8,
          }}
        >
          {row.map((cell) => (
            <Link
              key={cell.href}
              href={cell.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="w-card"
                style={{
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderColor: cell.accent
                    ? "var(--w-acc)"
                    : cell.ok
                      ? "oklch(0.86 0.18 145 / 0.5)"
                      : "var(--w-line)",
                  background: cell.accent
                    ? "var(--w-acc-soft)"
                    : "var(--w-surface-2)",
                }}
              >
                <div>
                  <div
                    className="w-type-meta"
                    style={{
                      color: cell.accent
                        ? "var(--w-acc-ink)"
                        : cell.ok
                          ? "var(--w-ok)"
                          : "var(--w-fg-muted)",
                    }}
                  >
                    {cell.eyebrow}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      marginTop: 4,
                      color: cell.ok ? "var(--w-ok)" : "var(--w-fg)",
                    }}
                  >
                    {cell.label}
                  </div>
                  {cell.badge && (
                    <div
                      className="w-type-meta"
                      style={{
                        marginTop: 4,
                        color: cell.accent
                          ? "var(--w-acc-ink)"
                          : "var(--w-fg-muted)",
                      }}
                    >
                      {cell.badge.toUpperCase()}
                    </div>
                  )}
                </div>
                <span style={{ color: "var(--w-fg-dim)" }}>
                  <IconArrow size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

async function renderActivity(_nightId: string, eventId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select(
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(15);
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    action: string;
    context: Record<string, unknown> | null;
    created_at: string;
    actor: { full_name: string | null } | null;
  }>;
  return (
    <section style={{ marginTop: 32 }}>
      <div
        className="w-type-meta"
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        LIVE ACTIVITY
        <span
          className="w-pulse"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            background: "var(--w-ok)",
            borderRadius: 0,
          }}
          aria-hidden="true"
        />
      </div>
      <ActivityFeedRealtime
        initialRows={rows}
        eventId={eventId}
        emptyTitle="Quiet so far"
        emptyBody="Holders haven't added anyone and the door hasn't opened yet."
      />
    </section>
  );
}
