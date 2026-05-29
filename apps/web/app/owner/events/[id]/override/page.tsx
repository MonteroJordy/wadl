import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import OverrideForm from "./override-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner override — WADL" };

export default async function OwnerOverridePage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_nights(id, night_date, doors_at, is_frozen)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
        is_frozen: boolean;
      }>;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights]
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))
    .map((n) => ({
      id: n.id,
      label: fmtDate(n.night_date),
      is_frozen: n.is_frozen,
    }));

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Override",
        ]}
      />
      <PageHeader
        eyebrow="Override"
        title="Owner override"
        sub="Manually admit a guest. Bypasses caps + lockdown. Audit-logged."
      />
      <EventSubNav active="guests" eventId={event.id} />

      <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
        {nights.length === 0 ? (
          <div className="t-body-2">Add a night first.</div>
        ) : (
          <OverrideForm eventId={event.id} nights={nights} />
        )}
      </div>
    </main>
  );
}
