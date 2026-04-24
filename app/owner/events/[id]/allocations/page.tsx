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

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={`/owner/events/${event.id}`} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono">Allocations</p>
      </header>

      <h1 className="display-lg mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        {allocs.length} {allocs.length === 1 ? "holder" : "holders"}
      </p>

      <Link
        href={`/owner/events/${event.id}/allocations/new`}
        className="btn-primary text-center mb-6 block"
      >
        + New allocation
      </Link>

      {nights.length === 0 ? (
        <EmptyState
          title="No nights yet"
          body="Add nights from settings, then come back to distribute allocations."
        />
      ) : allocs.length === 0 ? (
        <EmptyState
          title="No allocations yet"
          body="Add a promoter, artist, or brand allocation to start distributing the list."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {nights.map((n) => {
            const list = byNight.get(n.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={n.id}>
                <p className="label-mono mb-2">{fmtDate(n.night_date)}</p>
                <div className="flex flex-col gap-2">
                  {list.map((a) => {
                    const used = usedByAlloc.get(a.id) ?? 0;
                    return (
                      <Link
                        key={a.id}
                        href={`/owner/events/${event.id}/allocations/${a.id}`}
                        className="card hover:border-coral transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-sans text-cream font-semibold">
                              {a.holder_name}
                            </p>
                            <div className="flex gap-2 mt-1 label-mono">
                              {a.auto_approve && <span className="text-mint">Auto-approve</span>}
                              {!a.list_open && <span className="text-coral">Closed</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-2xl leading-none text-cream">
                              {used}
                              <span className="text-muted">/{a.cap}</span>
                            </p>
                            <p className="label-mono mt-1">Used</p>
                          </div>
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
