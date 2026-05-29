import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import FreezeButton from "./freeze-button";
import RealtimeCounters from "@/components/realtime-counters";
import ActivityFeedRealtime from "@/components/activity-feed-realtime";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Breadcrumb,
  CoverHeader,
  EventSubNav,
  Stat,
} from "@/components/v5";

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
    // No nights yet — v5 empty state, matches V5Empty.
    return (
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <Breadcrumb items={[["Events", "/owner"], event.name]} />
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
          <div className="t-display-md">No nights yet</div>
          <div
            className="t-body-2"
            style={{ marginTop: "var(--s-3)", maxWidth: 380 }}
          >
            Add a night from settings to start building the list. We&apos;ll
            publish a public RSVP page automatically.
          </div>
          <div
            style={{
              display: "flex",
              gap: "var(--s-2)",
              marginTop: "var(--s-6)",
            }}
          >
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="btn btn--accent"
              style={{ textDecoration: "none" }}
            >
              Go to settings
            </Link>
            <Link
              href="/owner"
              className="btn btn--ghost"
              style={{ textDecoration: "none" }}
            >
              Back to events
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
  let lastScanAt: string | null = null;

  for (const c of approvedScans) {
    const heads = 1 + (c.guest?.plus_ones ?? 0);
    scanned += heads;
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

  const cap = active.capacity_cap ?? 0;
  const pctFull = cap > 0 ? Math.round((scanned / cap) * 100) : 0;
  const totalList = approvedHeads + pendingHeads;
  const allocCount = allocRes.count ?? 0;
  const pendingCount = guests.filter((g) => g.status === "pending").length;

  // ─── v5 hero framing ───
  const doorsMs = new Date(active.doors_at).getTime() - Date.now();
  let heroEyebrow = `${fmtDate(active.night_date)} · doors ${fmtTime(active.doors_at)}`;
  if (doorsMs > 0 && doorsMs < 24 * 3_600_000) {
    const h = Math.floor(doorsMs / 3_600_000);
    const m = Math.floor((doorsMs % 3_600_000) / 60_000);
    heroEyebrow = `Doors in ${h > 0 ? `${h}h ` : ""}${m}m · ${fmtTime(active.doors_at)}`;
  }
  if (active.is_frozen) heroEyebrow += " · frozen";

  // ─── v5 Quick-actions card grid (real routes) ───
  const quickActions: Array<{ href: string; title: string; sub: string }> = [
    {
      href: `/door/events/${event.id}?night=${active.id}`,
      title: "Open the door",
      sub: `${scanned}${cap ? ` / ${cap}` : ""} scanned in`,
    },
    {
      href: `/owner/events/${event.id}/queue`,
      title:
        pendingCount > 0 ? `Review ${pendingCount} pending` : "Approval queue",
      sub:
        pendingCount > 0
          ? `${pendingHeads} heads waiting`
          : "Nothing waiting",
    },
    {
      href: `/owner/events/${event.id}/allocations`,
      title: "Promoter lists",
      sub: allocCount > 0 ? `${allocCount} allocations` : "No allocations yet",
    },
    {
      href: `/owner/events/${event.id}/staff`,
      title: "Door staff",
      sub: "Invite + brief your team",
    },
    {
      href: `/owner/events/${event.id}/chathub`,
      title: "Paste names",
      sub: "AI bulk-add to the list",
    },
    {
      href: `/owner/events/${event.id}/broadcast`,
      title: "Broadcast",
      sub: `${totalList} on list`,
    },
  ];

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb items={[["Events", "/owner"], event.name]} />

      <CoverHeader
        seed={event.name}
        eyebrow={heroEyebrow}
        title={event.name}
        height={300}
        actions={
          <>
            <Link
              href={`/owner/events/${event.id}/recap?night=${active.id}`}
              className="btn btn--ghost"
              style={{ textDecoration: "none" }}
            >
              Recap
            </Link>
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="btn btn--accent"
              style={{ textDecoration: "none" }}
            >
              Edit
            </Link>
          </>
        }
      />

      <EventSubNav active="overview" eventId={event.id} />

      {/* Multi-night picker — only when the event spans nights. */}
      {nights.length > 1 && (
        <div
          style={{
            padding: "var(--s-3) var(--s-8)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            gap: "var(--s-1)",
            overflowX: "auto",
          }}
        >
          {nights.map((n) => {
            const isActive = n.id === active.id;
            return (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}?night=${n.id}`}
                className={
                  "nav-item " + (isActive ? "nav-item--active" : "")
                }
                style={{
                  textDecoration: "none",
                  fontSize: "var(--ts-sm)",
                  whiteSpace: "nowrap",
                }}
              >
                {fmtDate(n.night_date)}
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── 4-up Stat row ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat
          label="Scanned in"
          value={cap ? `${scanned} / ${cap}` : String(scanned)}
          sub={cap ? `${pctFull}% full` : "no cap set"}
          delta={recentScans > 0 ? `+${recentScans} / 30m` : undefined}
        />
        <Stat
          label="Approved"
          value={String(approvedHeads)}
          sub={`${totalList} on list`}
        />
        <Stat
          label="Pending"
          value={String(pendingHeads)}
          sub={pendingCount > 0 ? `${pendingCount} waiting` : "queue clear"}
        />
        <Stat
          label="Allocations"
          value={String(allocCount)}
          sub={lastScanAt ? `last scan ${ago(lastScanAt)}` : "no scans yet"}
          last
        />
      </div>

      {/* ─── 2-col body: Quick actions · Recent activity ─── */}
      <div
        style={{
          padding: "var(--s-8)",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "var(--s-4)",
        }}
      >
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Quick actions
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--s-2)",
            }}
          >
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="card card--hover"
                style={{
                  padding: "var(--s-5)",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="t-h1">{a.title}</div>
                <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                  {a.sub}
                </div>
              </Link>
            ))}
          </div>

          {topHolderEntry && (
            <>
              <div
                className="t-meta"
                style={{
                  marginTop: "var(--s-6)",
                  marginBottom: "var(--s-3)",
                }}
              >
                Top holder
              </div>
              <div className="card" style={{ padding: "var(--s-5)" }}>
                <div className="t-h1">{topHolderEntry.name}</div>
                <div
                  className="t-meta"
                  style={{ marginTop: "var(--s-2)", color: "var(--ok)" }}
                >
                  {topHolderEntry.count} scanned
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: "var(--s-6)" }}>
            <FreezeButton
              eventId={event.id}
              nightId={active.id}
              frozen={active.is_frozen}
            />
          </div>
        </div>

        <div>
          <div
            className="t-meta"
            style={{
              marginBottom: "var(--s-3)",
              display: "flex",
              alignItems: "center",
              gap: "var(--s-2)",
            }}
          >
            Recent activity
            <RealtimeCounters nightId={active.id} />
          </div>
          {await renderActivity(active.id, event.id)}
        </div>
      </div>
    </main>
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
  // ActivityFeedRealtime renders the live-updating list; the v5 `.card`
  // wrapper gives it the bordered surface from the V5EventOverview mockup.
  return (
    <div className="card">
      <ActivityFeedRealtime
        initialRows={rows}
        eventId={eventId}
        emptyTitle="Quiet so far"
        emptyBody="Holders haven't added anyone and the door hasn't opened yet."
      />
    </div>
  );
}
