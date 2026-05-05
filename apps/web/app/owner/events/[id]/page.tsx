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

  // Live analytics fetch.
  const [guestsRes, checkInsRes, allocRes, pendingRes] = await Promise.all([
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
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", active.id)
      .eq("status", "pending"),
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
  const pendingCount = pendingRes.count ?? 0;

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
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/owner"
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <Link
            href={`/owner/events/${event.id}/settings`}
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            SETTINGS →
          </Link>
        </div>

        {/* Hero */}
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="w-type-meta">
              {fmtDate(active.night_date).toUpperCase()} · DOORS{" "}
              {fmtTime(active.doors_at).toUpperCase()}
              {active.is_frozen ? " · FROZEN" : ""}
            </div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 8 }}
            >
              {event.name}
            </div>
          </div>
          <RealtimeCounters nightId={active.id} />
        </div>

        {/* Setup nudge */}
        {allocCount === 0 && approvedHeads === 0 && (
          <div
            className="w-card"
            style={{
              padding: 20,
              marginTop: 24,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div className="w-type-meta" style={{ color: "var(--w-acc-ink)" }}>
              SET UP YOUR LIST
            </div>
            <div className="w-type-h2" style={{ marginTop: 6 }}>
              No allocations yet
            </div>
            <p
              className="w-type-body-sm"
              style={{ marginTop: 8, lineHeight: 1.5 }}
            >
              An allocation is a slice of your door given to a promoter, artist,
              or partner. They get a magic link, add guests up to their cap,
              and you see who added whom — no accounts on their end.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 14,
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

        {/* Multi-night picker */}
        {nights.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 20,
              overflowX: "auto",
            }}
            className="w-noscroll"
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

        {/* Big stat strip — Scanned in / Full / Approved / Pending / Allocs */}
        <section
          className="w-card"
          style={{ padding: 24, marginTop: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="w-type-meta">SCANNED IN</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontSize: 88,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.92,
                  marginTop: 4,
                }}
              >
                {scanned}
                <span style={{ color: "var(--w-fg-dim)", fontSize: 44 }}>
                  /{cap || "—"}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="w-type-meta">FULL</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: "-0.035em",
                  lineHeight: 0.92,
                  color: "var(--w-acc-ink)",
                  background: "var(--w-acc)",
                  padding: "0 14px",
                  display: "inline-block",
                  marginTop: 4,
                }}
              >
                {pctFull}%
              </div>
            </div>
          </div>
          {cap > 0 && (
            <div style={{ marginTop: 18 }}>
              <CapacityMeter
                current={scanned}
                total={cap}
                accent
                label="DOOR CAPACITY"
              />
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginTop: 18,
            }}
          >
            <BigStat
              label="APPROVED"
              value={approvedHeads}
            />
            <BigStat
              label="PENDING"
              value={pendingHeads}
              tone={pendingHeads > 0 ? "warn" : "neutral"}
            />
            <BigStat label="ALLOCS" value={allocCount} />
          </div>

          {scanned > 0 && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--w-line)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
              }}
            >
              <MiniStat
                label="LAST SCAN"
                value={lastScanAt ? ago(lastScanAt) : "—"}
              />
              <MiniStat label="LAST 30M" value={`${recentScans} in`} />
              {(() => {
                if (!cap || cap <= 0) return null;
                if (scanned >= cap) {
                  return (
                    <MiniStat
                      label="AT CAP"
                      value="Now"
                      tone="err"
                    />
                  );
                }
                if (recentScans <= 0) {
                  return <MiniStat label="PACE" value="—" tone="muted" />;
                }
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
            </div>
          )}
        </section>

        {/* Arrivals by hour */}
        {hours.length > 0 && scanned > 0 && (
          <section
            className="w-card"
            style={{ padding: 20, marginTop: 12 }}
          >
            <div className="w-type-meta">ARRIVALS BY HOUR</div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 96,
                marginTop: 14,
              }}
            >
              {hours.map((b) => {
                const h = (b.count / peakHourCount) * 100;
                const isPeak = b.count > 0 && b.count === peakHourCount;
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
                    title={`${fmtHour(b.hour)}: ${b.count}`}
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
          </section>
        )}

        {/* Top holder */}
        {topHolderEntry && (
          <section
            className="w-card"
            style={{ padding: 20, marginTop: 12 }}
          >
            <div className="w-type-meta">TOP HOLDER SO FAR</div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginTop: 8,
                gap: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 17,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {topHolderEntry.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--w-mono)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--w-ok)",
                }}
              >
                {topHolderEntry.count}
                <span
                  style={{
                    color: "var(--w-fg-muted)",
                    fontWeight: 400,
                    marginLeft: 4,
                  }}
                >
                  scanned in
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Action grids */}
        <ActionGrid
          rows={[
            [
              {
                href: `/owner/events/${event.id}/allocations`,
                eyebrow: "MANAGE",
                label: "Allocations",
                badge: allocCount > 0 ? `${allocCount}` : undefined,
              },
              {
                href: `/owner/events/${event.id}/queue`,
                eyebrow: "REVIEW",
                label: "Queue",
                badge:
                  pendingCount > 0 ? `${pendingCount} pending` : undefined,
                accent: pendingCount > 0,
              },
            ],
            [
              {
                href: `/owner/events/${event.id}/staff`,
                eyebrow: "DOOR",
                label: "Staff",
              },
              {
                href: `/door/events/${event.id}?night=${active.id}`,
                eyebrow: "LIVE",
                label: "Door view",
                ok: true,
              },
            ],
            [
              {
                href: `/owner/events/${event.id}/chathub`,
                eyebrow: "PASTE",
                label: "Chat Hub",
              },
              {
                href: `/owner/events/${event.id}/waitlist`,
                eyebrow: "BACKUPS",
                label: "Waitlist",
              },
              {
                href: `/owner/events/${event.id}/co-owners`,
                eyebrow: "SHARE",
                label: "Co-owners",
              },
            ],
            [
              {
                href: `/owner/events/${event.id}/recap?night=${active.id}`,
                eyebrow: "POST",
                label: "Recap",
              },
              {
                href: `/owner/events/${event.id}/scorecards`,
                eyebrow: "HOLDERS",
                label: "Scorecards",
              },
              {
                href: `/owner/events/${event.id}/audit`,
                eyebrow: "TRAIL",
                label: "Audit log",
              },
            ],
          ]}
        />

        {/* Freeze + secondary links */}
        <div style={{ marginTop: 16 }}>
          <FreezeButton
            eventId={event.id}
            nightId={active.id}
            frozen={active.is_frozen}
          />
        </div>

        {totalList === 0 && (
          <div style={{ marginTop: 16 }}>
            <EmptyState
              title="No guests yet"
              body="Invite a promoter or share the discovery page to start the list."
            />
          </div>
        )}

        {/* Tertiary links — secondary toolbox */}
        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 4,
            border: "1px solid var(--w-line)",
            background: "var(--w-surface-2)",
          }}
        >
          {[
            ["EXPORT CSV", `/owner/events/${event.id}/export`],
            ["EXPORT PDF", `/owner/events/${event.id}/export/pdf`],
            ["PRINT ROSTER", `/owner/events/${event.id}/print`],
            ["CLONE EVENT", `/owner/events/${event.id}/clone`],
            ["IMPORT CSV", `/owner/events/${event.id}/guests/import`],
            ["BROADCAST SMS", `/owner/events/${event.id}/broadcast`],
            ["TEMPLATES", `/owner/events/${event.id}/template`],
            ["EMBED WIDGET", `/embed/${event.id}`, "_blank"],
          ].map(([label, href, target]) => (
            <Link
              key={label}
              href={href as string}
              target={(target as string | undefined) ?? undefined}
              className="w-type-meta"
              style={{
                textDecoration: "none",
                padding: "12px 14px",
                borderRight: "1px solid var(--w-line)",
                color: "var(--w-fg-muted)",
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
              padding: "12px 14px",
              color: "var(--w-err)",
            }}
          >
            OVERRIDE ADMIT
          </Link>
        </section>

        {await renderActivity(active.id, event.id)}
      </div>
    </main>
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
