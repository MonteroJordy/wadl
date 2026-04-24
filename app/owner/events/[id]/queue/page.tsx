import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import QueueRow from "./row";
import BulkActions from "./bulk";

export const dynamic = "force-dynamic";

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

export default async function QueuePage({
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

  const nights = ((event.event_nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
  }>).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  const nightIds = nights.map((n) => n.id);

  let pending: Array<{
    id: string;
    event_night_id: string;
    allocation_id: string | null;
    full_name: string;
    plus_ones: number;
    created_at: string;
  }> = [];
  let allocs: Array<{ id: string; holder_name: string }> = [];
  if (nightIds.length > 0) {
    const [pRes, aRes] = await Promise.all([
      supabase
        .from("guests")
        .select("id, event_night_id, allocation_id, full_name, plus_ones, created_at")
        .in("event_night_id", nightIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("allocations")
        .select("id, holder_name")
        .in("event_night_id", nightIds),
    ]);
    pending = (pRes.data ?? []) as typeof pending;
    allocs = (aRes.data ?? []) as typeof allocs;
  }

  const holderById = new Map(allocs.map((a) => [a.id, a.holder_name]));
  const byNight = new Map<string, typeof pending>();
  for (const g of pending) {
    if (!byNight.has(g.event_night_id)) byNight.set(g.event_night_id, []);
    byNight.get(g.event_night_id)!.push(g);
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={`/owner/events/${event.id}`} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono">Queue</p>
      </header>

      <h1 className="display-lg mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        {pending.length} pending
      </p>

      {pending.length === 0 ? (
        <div className="card text-center mt-4">
          <p className="label-mono mb-2">Queue empty</p>
          <p className="text-muted text-sm">
            Nothing waiting for approval. Auto-approved allocations bypass this view.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {nights.map((n) => {
            const list = byNight.get(n.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={n.id}>
                <p className="label-mono mb-2">{fmtDate(n.night_date)} · {list.length} pending</p>
                <BulkActions eventId={event.id} nightId={n.id} count={list.length} />
                <div className="flex flex-col gap-2">
                  {list.map((g) => (
                    <QueueRow
                      key={g.id}
                      eventId={event.id}
                      guestId={g.id}
                      fullName={g.full_name}
                      plusOnes={g.plus_ones}
                      holderLabel={
                        g.allocation_id
                          ? holderById.get(g.allocation_id) ?? "Holder"
                          : "Direct add"
                      }
                      addedAgo={ago(g.created_at)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
