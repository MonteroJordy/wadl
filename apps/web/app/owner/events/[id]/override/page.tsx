import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
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
    .select(
      "id, name, event_nights(id, night_date, doors_at, is_frozen)"
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
      className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream"
        >
          ← {event.name}
        </Link>
        <h1 className="display-lg mt-3 mb-2">Owner override</h1>
        <p className="label-mono">
          Manually admit a guest. Bypasses caps + lockdown. Audit-logged.
        </p>
      </header>

      {nights.length === 0 ? (
        <p className="text-muted">Add a night first.</p>
      ) : (
        <OverrideForm eventId={event.id} nights={nights} />
      )}
    </main>
  );
}
