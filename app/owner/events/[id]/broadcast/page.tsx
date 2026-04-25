import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import BroadcastForm from "./broadcast-form";

export const dynamic = "force-dynamic";

export default async function BroadcastPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, event_nights(id, night_date, doors_at, allocations(id, holder_name))"
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
        allocations: Array<{ id: string; holder_name: string }>;
      }>;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights]
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))
    .map((n) => ({ id: n.id, label: fmtDate(n.night_date) }));

  const allocations: Array<{ id: string; night_id: string; label: string }> = [];
  for (const n of event.event_nights)
    for (const a of n.allocations ?? [])
      allocations.push({
        id: a.id,
        night_id: n.id,
        label: `${a.holder_name} (${fmtDate(n.night_date)})`,
      });

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <Link
        href={`/owner/events/${event.id}`}
        className="label-mono hover:text-cream"
      >
        ← Back
      </Link>
      <h1 className="display-lg mt-3 mb-2">Broadcast SMS</h1>
      <p className="label-mono mb-6">
        Send to a filtered slice of {event.name}. Dry-run first to see the count.
      </p>

      <BroadcastForm
        eventId={event.id}
        nights={nights}
        allocations={allocations}
      />
    </main>
  );
}
