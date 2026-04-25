import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import NewAllocationForm from "./form";

export const dynamic = "force-dynamic";

export default async function NewAllocationPage({
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

  if (nights.length === 0) {
    return (
      <main id="main-content" className="mobile-frame">
        <h1 className="display-lg mt-6 mb-4">No nights yet</h1>
        <p className="text-muted text-sm">Add a night before creating an allocation.</p>
      </main>
    );
  }

  return <NewAllocationForm eventId={event.id} eventName={event.name} nights={nights} />;
}
