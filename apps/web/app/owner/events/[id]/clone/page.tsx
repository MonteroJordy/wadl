import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import CloneForm from "./form";

export const dynamic = "force-dynamic";

export default async function CloneEventPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, doors_at)"
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = (event.event_nights ?? []) as Array<{
    id: string;
    doors_at: string;
  }>;
  const earliest = [...nights].sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))[0];

  // Count allocations across nights.
  const nightIds = nights.map((n) => n.id);
  const { count: allocCount } = nightIds.length
    ? await supabase
        .from("allocations")
        .select("id", { count: "exact", head: true })
        .in("event_night_id", nightIds)
    : { count: 0 };

  return (
    <CloneForm
      eventId={event.id}
      sourceName={event.name}
      sourceNightCount={nights.length}
      sourceAllocCount={allocCount ?? 0}
      earliestNightIso={earliest?.doors_at ?? null}
    />
  );
}
