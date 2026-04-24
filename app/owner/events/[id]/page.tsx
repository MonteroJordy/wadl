import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import FreezeButton from "./freeze-button";

export const dynamic = "force-dynamic";

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
    .select("id, name, description, flyer_url, event_type, venue_id, account_id, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct, is_frozen)")
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
      <main className="mobile-frame">
        <Link href="/owner" className="label-mono hover:text-cream">← Back</Link>
        <h1 className="display-lg mt-4 mb-2">{event.name}</h1>
        <div className="card mt-6">
          <p className="label-mono mb-2">No nights yet</p>
          <p className="text-muted text-sm">
            Add nights from settings to light this up.
          </p>
          <Link
            href={`/owner/events/${event.id}/settings`}
            className="btn-primary text-center mt-4 block"
          >
            Go to settings
          </Link>
        </div>
      </main>
    );
  }

  // Pick active night: query param, else next upcoming (first whose doors_at >= now), else first.
  const now = Date.now();
  const upcoming = nights.find((n) => new Date(n.doors_at).getTime() >= now);
  const defaultNight = upcoming ?? nights[0];
  const active =
    nights.find((n) => n.id === searchParams.night) ?? defaultNight;

  const [guestsRes, checkInsRes, allocRes, pendingRes] = await Promise.all([
    supabase.from("guests").select("status", { count: "exact", head: false }).eq("event_night_id", active.id),
    supabase.from("check_ins").select("state").eq("event_night_id", active.id),
    supabase.from("allocations").select("id", { count: "exact", head: true }).eq("event_night_id", active.id),
    supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_night_id", active.id).eq("status", "pending"),
  ]);

  const guests = guestsRes.data ?? [];
  const approved = guests.filter((g) => g.status === "approved").length;
  const totalList = approved + (pendingRes.count ?? 0);
  const scanned = (checkInsRes.data ?? []).filter((c) => c.state === "approved").length;
  const cap = active.capacity_cap ?? 0;
  const pctFull = cap > 0 ? Math.round((scanned / cap) * 100) : 0;

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/owner" className="label-mono hover:text-cream">← Back</Link>
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
      <p className="label-mono mb-6">
        {fmtDate(active.night_date)} · Doors {fmtTime(active.doors_at)}
      </p>

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
            <p className="font-display text-4xl text-coral leading-none">{pctFull}%</p>
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
            <p className="font-display text-2xl text-cream">{approved}</p>
          </div>
          <div>
            <p className="label-mono">Pending</p>
            <p className="font-display text-2xl text-gold">
              {pendingRes.count ?? 0}
            </p>
          </div>
          <div>
            <p className="label-mono">Allocs</p>
            <p className="font-display text-2xl text-cream">
              {allocRes.count ?? 0}
            </p>
          </div>
        </div>
      </section>

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

      <div className="mb-4">
        <FreezeButton
          eventId={event.id}
          nightId={active.id}
          frozen={active.is_frozen}
        />
      </div>

      {totalList === 0 && (
        <p className="label-mono text-center mt-2">
          No guests yet. Add allocations to start the list.
        </p>
      )}
    </main>
  );
}
