import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import SettingsForm from "./form";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, description, flyer_url, account_id, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!event) notFound();

  const nights = ((event.event_nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
    cutoff_at: string | null;
    capacity_cap: number | null;
    lockdown_threshold_pct: number;
  }>).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">Settings</p>
      </header>

      <h1 className="display-lg mb-6">{event.name}</h1>

      <SettingsForm
        eventId={event.id}
        initial={{
          name: event.name,
          description: event.description ?? "",
          flyer_url: event.flyer_url ?? "",
        }}
        nights={nights}
      />
    </main>
  );
}
