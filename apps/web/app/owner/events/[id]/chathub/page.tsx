import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import ChatHubFlow from "./flow";

export const dynamic = "force-dynamic";

export default async function ChatHubPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, night_date, doors_at)"
    )
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
  const { data: allocs } = nightIds.length
    ? await supabase
        .from("allocations")
        .select("id, holder_name, event_night_id")
        .in("event_night_id", nightIds)
        .order("holder_name")
    : { data: [] };

  return (
    <ChatHubFlow
      eventId={event.id}
      eventName={event.name}
      nights={nights}
      allocations={(allocs ?? []) as Array<{ id: string; holder_name: string }>}
    />
  );
}
