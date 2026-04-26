import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface NightLite {
  id: string;
  night_date: string;
  doors_at: string;
}

interface AllocationRow {
  id: string;
  event_night_id: string;
  holder_name: string;
  cap: number;
  auto_approve: boolean;
  list_open: boolean;
}

interface GuestCount {
  allocation_id: string | null;
  plus_ones: number;
  status: string;
}

export default async function AllocationsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id, event_nights(id, night_date, doors_at)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = ((event.event_nights ?? []) as NightLite[]).sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );

  const nightIds = nights.map((n) => n.id);
  let allocs: AllocationRow[] = [];
  let guests: GuestCount[] = [];
  if (nightIds.length > 0) {
    const [aRes, gRes] = await Promise.all([
      supabase
        .from("allocations")
        .select("id, event_night_id, holder_name, cap, auto_approve, list_open")
        .in("event_night_id", nightIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("guests")
        .select("allocation_id, plus_ones, status")
        .in("event_night_id", nightIds)
        .in("status", ["approved", "pending"]),
    ]);
    allocs = (aRes.data ?? []) as AllocationRow[];
    guests = (gRes.data ?? []) as GuestCount[];
  }

  const usedByAlloc = new Map<string, number>();
  for (const g of guests) {
    if (!g.allocation_id) continue;
    const add = 1 + (g.plus_ones ?? 0);
    usedByAlloc.set(g.allocation_id, (usedByAlloc.get(g.allocation_id) ?? 0) + add);
  }

  const byNight = new Map<string, AllocationRow[]>();
  for (const a of allocs) {
    if (!byNight.has(a.event_night_id)) byNight.set(a.event_night_id, []);
    byNight.get(a.event_night_id)!.push(a);
  }

  // Aggregate stats — total cap, used, headroom.
  const totalCap = allocs.reduce((s, a) => s + a.cap, 0);
  const totalUsed = Array.from(usedByAlloc.values()).reduce((s, n) => s + n, 0);
  const fillPct = totalCap === 0 ? 0 : Math.round((totalUsed / totalCap) * 100);

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-5xl px-4 md:px-8 pt-6 pb-16"
    >
      <header className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <Link
            href={`/owner/events/${event.id}`}
            className="label-mono hover:text-cream transition mb-2 inline-block"
          >
            ← {event.name}
          </Link>
          <h1 className="font-display text-4xl md:text-5xl text-cream uppercase tracking-wide leading-[0.9]">
            Allocations
          </h1>
          <p className="label-mono mt-2">
            {allocs.length} {allocs.length === 1 ? "holder" : "holders"} · {totalUsed}/{totalCap} used
          </p>
        </div>
        <Link
          href={`/owner/events/${event.id}/allocations/new`}
          className="shrink-0 inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
        >
          + New
        </Link>
      </header>

      {/* Aggregate fill bar */}
      {totalCap > 0 && (
        <div className="card mb-6">
          <div className="flex items-end justify-between mb-3">
            <p className="label-mono">Total capacity</p>
            <p className={`label-mono ${fillPct >= 90 ? "text-coral" : fillPct >= 70 ? "text-gold" : "text-mint"}`}>
              {fillPct}% filled
            </p>
          </div>
          <div className="h-2 bg-s3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                fillPct >= 90 ? "bg-coral" : fillPct >= 70 ? "bg-gold" : "bg-mint"
              }`}
              style={{ width: `${Math.min(100, fillPct)}%` }}
            />
          </div>
        </div>
      )}

      {nights.length === 0 ? (
        <section className="rounded-2xl border border-line bg-s1 px-6 py-16 text-center">
          <p className="font-display text-3xl text-cream uppercase tracking-wide mb-2">
            No nights yet
          </p>
          <p className="text-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
            Add nights from settings, then come back to distribute the list.
          </p>
          <Link
            href={`/owner/events/${event.id}/settings`}
            className="inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
          >
            Open settings
          </Link>
        </section>
      ) : allocs.length === 0 ? (
        <section className="rounded-2xl border border-line bg-s1 px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral/10 border border-coral/30 mx-auto mb-5 flex items-center justify-center">
            <span className="font-display text-3xl text-coral">+</span>
          </div>
          <p className="font-display text-3xl text-cream uppercase tracking-wide mb-2">
            No allocations yet
          </p>
          <p className="text-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
            Drop a promoter, artist, or brand a magic link. They add names up
            to their cap. Every name gets attributed back.
          </p>
          <Link
            href={`/owner/events/${event.id}/allocations/new`}
            className="inline-flex items-center gap-2 bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.16em] px-5 py-3 rounded-full hover:brightness-110 transition"
          >
            + Add first allocation
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          {nights.map((n) => {
            const list = byNight.get(n.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={n.id}>
                <p className="label-mono mb-3">{fmtDate(n.night_date)} · {list.length}</p>
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                  {list.map((a) => {
                    const used = usedByAlloc.get(a.id) ?? 0;
                    const pct = a.cap === 0 ? 0 : (used / a.cap) * 100;
                    const tone =
                      pct >= 100 ? "coral" : pct >= 80 ? "gold" : "mint";
                    return (
                      <Link
                        key={a.id}
                        href={`/owner/events/${event.id}/allocations/${a.id}`}
                        className="card hover:border-coral/60 transition group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-sans text-cream font-semibold truncate group-hover:text-coral transition">
                              {a.holder_name}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1 label-mono">
                              {a.auto_approve && (
                                <span className="text-mint">Auto-approve</span>
                              )}
                              {!a.list_open && (
                                <span className="text-coral">Closed</span>
                              )}
                              {a.list_open && !a.auto_approve && (
                                <span>Host approves</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display text-3xl leading-none text-cream">
                              {used}
                              <span className="text-muted text-xl">/{a.cap}</span>
                            </p>
                          </div>
                        </div>
                        <div className="h-1 bg-s3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-${tone}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
