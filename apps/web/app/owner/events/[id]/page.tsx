import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import { fmtHour } from "@/lib/recap";
import FreezeButton from "./freeze-button";
import EmptyState from "@/components/empty-state";
import RealtimeCounters from "@/components/realtime-counters";
import ActivityFeed from "@/components/activity-feed";
import { createAdminClient } from "@/lib/supabase/admin";

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
      "id, name, description, flyer_url, event_type, venue_id, account_id, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct, is_frozen)"
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
      <main id="main-content" className="mobile-frame">
        <Link href="/owner" className="label-mono hover:text-cream">
          ← Back
        </Link>
        <h1 className="display-lg mt-4 mb-6">{event.name}</h1>
        <EmptyState
          title="No nights yet"
          body="Add a night from settings to start building the list."
          action={
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="btn-primary inline-block"
            >
              Go to settings
            </Link>
          }
        />
      </main>
    );
  }

  // Active night.
  const now = Date.now();
  const upcoming = nights.find((n) => new Date(n.doors_at).getTime() >= now);
  const defaultNight = upcoming ?? nights[0];
  const active = nights.find((n) => n.id === searchParams.night) ?? defaultNight;

  // Live analytics fetch. Pull check_ins with joined guest/allocation so
  // we can show last-scan, arrival curve, and top holder inline.
  const [guestsRes, checkInsRes, allocRes, pendingRes] = await Promise.all([
    supabase.from("guests").select("status, plus_ones").eq("event_night_id", active.id),
    supabase
      .from("check_ins")
      .select(
        "state, scanned_at, guest:guests!inner(plus_ones, allocation_id, allocation:allocations(holder_name))"
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
    (c) => Date.now() - new Date(c.scanned_at).getTime() < 30 * 60_000
  ).length;

  const topHolderEntry = [...holderScans.values()].sort(
    (a, b) => b.count - a.count
  )[0];

  // Build an hour array spanning first scan hour → now (or a 4-hour window).
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

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/owner" className="label-mono hover:text-cream">
          ← Back
        </Link>
        <Link
          href={`/owner/events/${event.id}/settings`}
          className="label-mono hover:text-cream"
        >
          Settings
        </Link>
      </header>

      {event.flyer_url ? (
        <div
          className="w-full rounded-lg overflow-hidden mb-4 border border-line"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.flyer_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <h1 className="display-lg mb-1">{event.name}</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="label-mono">
          {fmtDate(active.night_date)} · Doors {fmtTime(active.doors_at)}
        </p>
        <RealtimeCounters nightId={active.id} />
      </div>

      {nights.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {nights.map((n) => {
            const isActive = n.id === active.id;
            return (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}?night=${n.id}`}
                className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                  isActive
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {fmtDate(n.night_date)}
              </Link>
            );
          })}
        </div>
      )}

      <section className="card mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="label-mono">Scanned in</p>
            <p className="font-display text-6xl leading-none text-cream">
              {scanned}
              <span className="text-muted">/{cap || "—"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="label-mono">Full</p>
            <p className="font-display text-4xl text-coral leading-none">
              {pctFull}%
            </p>
          </div>
        </div>
        <div className="h-2 bg-s3 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-coral"
            style={{ width: `${Math.min(100, pctFull)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div>
            <p className="label-mono">Approved</p>
            <p className="font-display text-2xl text-cream">{approvedHeads}</p>
          </div>
          <div>
            <p className="label-mono">Pending</p>
            <p className="font-display text-2xl text-gold">{pendingHeads}</p>
          </div>
          <div>
            <p className="label-mono">Allocs</p>
            <p className="font-display text-2xl text-cream">
              {allocRes.count ?? 0}
            </p>
          </div>
        </div>

        {scanned > 0 && (
          <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3">
            <div>
              <p className="label-mono">Last scan</p>
              <p className="font-sans text-sm text-cream">
                {lastScanAt ? ago(lastScanAt) : "—"}
              </p>
            </div>
            <div>
              <p className="label-mono">Last 30m</p>
              <p className="font-sans text-sm text-cream">
                {recentScans} in
              </p>
            </div>
          </div>
        )}
      </section>

      {hours.length > 0 && scanned > 0 && (
        <section className="card mb-4">
          <p className="label-mono mb-3">Arrivals by hour</p>
          <div className="flex items-end gap-1 h-20">
            {hours.map((b) => {
              const h = (b.count / peakHourCount) * 100;
              const isPeak = b.count > 0 && b.count === peakHourCount;
              return (
                <div
                  key={b.hour}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${fmtHour(b.hour)}: ${b.count}`}
                >
                  <div
                    className={`w-full rounded-t ${
                      isPeak ? "bg-coral" : "bg-mint/60"
                    }`}
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                  <p className="label-mono text-[9px]">{fmtHour(b.hour)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {topHolderEntry && (
        <section className="card mb-4">
          <p className="label-mono mb-1">Top holder so far</p>
          <p className="font-sans text-cream font-semibold">
            {topHolderEntry.name}
          </p>
          <p className="label-mono mt-1">
            <span className="text-mint">{topHolderEntry.count}</span> scanned in
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href={`/owner/events/${event.id}/allocations`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Manage</p>
          <p className="font-sans font-semibold text-cream">Allocations</p>
        </Link>
        <Link
          href={`/owner/events/${event.id}/queue`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Review</p>
          <p className="font-sans font-semibold text-cream">
            Queue
            {(pendingRes.count ?? 0) > 0 && (
              <span className="ml-1 text-gold">· {pendingRes.count}</span>
            )}
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href={`/owner/events/${event.id}/staff`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Door</p>
          <p className="font-sans font-semibold text-cream">Staff</p>
        </Link>
        <Link
          href={`/door/events/${event.id}?night=${active.id}`}
          className="card text-center border-mint/40 hover:border-mint transition"
        >
          <p className="label-mono mb-1 text-mint">Live</p>
          <p className="font-sans font-semibold text-mint">Door view</p>
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-2 mb-4">
        <Link
          href={`/owner/events/${event.id}/chathub`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Paste</p>
          <p className="font-sans font-semibold text-cream">Chat Hub</p>
        </Link>
        <Link
          href={`/owner/events/${event.id}/waitlist`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Backups</p>
          <p className="font-sans font-semibold text-cream">Waitlist</p>
        </Link>
        <Link
          href={`/owner/events/${event.id}/co-owners`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Share</p>
          <p className="font-sans font-semibold text-cream">Co-owners</p>
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-2 mb-4">
        <Link
          href={`/owner/events/${event.id}/recap?night=${active.id}`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Post</p>
          <p className="font-sans font-semibold text-cream">Recap</p>
        </Link>
        <Link
          href={`/owner/events/${event.id}/scorecards`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Holders</p>
          <p className="font-sans font-semibold text-cream">Scorecards</p>
        </Link>
        <Link
          href={`/owner/events/${event.id}/audit`}
          className="card text-center hover:border-coral transition"
        >
          <p className="label-mono mb-1">Trail</p>
          <p className="font-sans font-semibold text-cream">Audit log</p>
        </Link>
      </section>

      <div className="mb-4">
        <FreezeButton
          eventId={event.id}
          nightId={active.id}
          frozen={active.is_frozen}
        />
      </div>

      {totalList === 0 && (
        <EmptyState
          title="No guests yet"
          body="Invite a promoter or share the discovery page to start the list."
        />
      )}

      <section className="grid grid-cols-2 gap-2 mt-4">
        <Link
          href={`/owner/events/${event.id}/export`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Export CSV
        </Link>
        <Link
          href={`/owner/events/${event.id}/export/pdf`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Export PDF
        </Link>
        <Link
          href={`/owner/events/${event.id}/print`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Print roster
        </Link>
        <Link
          href={`/owner/events/${event.id}/clone`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Clone event
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-2 mt-2">
        <Link
          href={`/owner/events/${event.id}/guests/import`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Import CSV
        </Link>
        <Link
          href={`/owner/events/${event.id}/broadcast`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Broadcast SMS
        </Link>
        <Link
          href={`/owner/events/${event.id}/template`}
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Templates
        </Link>
        <Link
          href={`/owner/events/${event.id}/override`}
          className="label-mono text-center py-2 hover:text-cream transition text-coral"
        >
          Override admit
        </Link>
        <Link
          href={`/embed/${event.id}`}
          target="_blank"
          className="label-mono text-center py-2 hover:text-cream transition"
        >
          Embed widget
        </Link>
      </section>

      {await renderActivity(active.id, event.id)}
    </main>
  );
}

async function renderActivity(nightId: string, eventId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select(
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name)"
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
    <section className="mt-6">
      <p className="label-mono mb-2">Live activity</p>
      <ActivityFeed
        rows={rows}
        emptyTitle="Quiet so far"
        emptyBody="Holders haven't added anyone and the door hasn't opened yet."
      />
    </section>
  );
}
