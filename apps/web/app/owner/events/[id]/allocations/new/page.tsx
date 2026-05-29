import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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

  const nights = (
    (event.event_nights ?? []) as Array<{
      id: string;
      night_date: string;
      doors_at: string;
    }>
  ).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  if (nights.length === 0) {
    return (
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <Breadcrumb
          items={[
            ["Events", "/owner"],
            [event.name, `/owner/events/${event.id}`],
            ["Allocations", `/owner/events/${event.id}/allocations`],
            "New",
          ]}
        />
        <PageHeader
          eyebrow="New allocation"
          title="No nights yet"
          sub="Add a night before creating an allocation."
        />
        <EventSubNav active="guests" eventId={event.id} />
      </main>
    );
  }

  return (
    <NewAllocationForm
      eventId={event.id}
      eventName={event.name}
      nights={nights}
    />
  );
}
