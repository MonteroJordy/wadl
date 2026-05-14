import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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
      "id, name, event_nights(id, night_date, doors_at, allocations(id, holder_name))",
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

  const allocations: Array<{ id: string; night_id: string; label: string }> =
    [];
  for (const n of event.event_nights)
    for (const a of n.allocations ?? [])
      allocations.push({
        id: a.id,
        night_id: n.id,
        label: `${a.holder_name} (${fmtDate(n.night_date)})`,
      });

  const { data: templatesData } = await supabase
    .from("sms_templates")
    .select("id, key, label, body")
    .eq("account_id", account.id)
    .order("label");
  const templates = (templatesData ?? []) as Array<{
    id: string;
    key: string;
    label: string;
    body: string;
  }>;

  return (
    <main id="main-content">
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Comms",
        ]}
      />
      <PageHeader
        eyebrow={`${templates.length} saved template${
          templates.length === 1 ? "" : "s"
        } · broadcast SMS`}
        title="Comms"
        sub={`Send to a filtered slice of ${event.name}. Preview the count before anything goes out.`}
      />
      <EventSubNav active="comms" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        <BroadcastForm
          eventId={event.id}
          nights={nights}
          allocations={allocations}
          templates={templates}
        />
      </div>
    </main>
  );
}
