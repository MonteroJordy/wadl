import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import EmptyState from "@/components/empty-state";
import PromoteButton from "./row-buttons";

export const dynamic = "force-dynamic";

interface WaitlistRow {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  created_at: string;
  event_night_id: string;
  allocation: { holder_name: string } | null;
}

export default async function WaitlistPage({
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
  const { data: rows } = nightIds.length
    ? await supabase
        .from("guests")
        .select(
          "id, full_name, plus_ones, tier, created_at, event_night_id, allocation:allocations(holder_name)"
        )
        .in("event_night_id", nightIds)
        .eq("status", "waitlisted")
        .order("created_at", { ascending: true })
    : { data: [] };

  const list = (rows ?? []) as unknown as WaitlistRow[];
  const byNight = new Map<string, WaitlistRow[]>();
  for (const r of list) {
    if (!byNight.has(r.event_night_id)) byNight.set(r.event_night_id, []);
    byNight.get(r.event_night_id)!.push(r);
  }

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream transition"
        >
          ← Back
        </Link>
        <p className="label-mono">Waitlist</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        {list.length} waiting · oldest gets promoted automatically when a seat
        opens up
      </p>

      {list.length === 0 ? (
        <EmptyState
          title="No one on the waitlist"
          body="If a night fills up, set pending RSVPs to waitlist from the queue. They'll get auto-promoted (with SMS) when a confirmed guest cancels."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {nights.map((n) => {
            const items = byNight.get(n.id) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={n.id}>
                <p className="label-mono mb-2">{fmtDate(n.night_date)} · {items.length} waiting</p>
                <div className="flex flex-col gap-2">
                  {items.map((r, idx) => (
                    <div key={r.id} className="card flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-cream font-semibold truncate">
                          <span className="text-muted">#{idx + 1}</span>{" "}
                          {r.full_name}
                          {r.plus_ones > 0 && (
                            <span className="text-muted font-normal"> +{r.plus_ones}</span>
                          )}
                        </p>
                        <p className="label-mono mt-1 truncate">
                          {r.tier.toUpperCase()}
                          {r.allocation?.holder_name && ` · ${r.allocation.holder_name}`}
                        </p>
                      </div>
                      <PromoteButton eventId={event.id} guestId={r.id} />
                    </div>
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
