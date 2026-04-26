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
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 md:px-8 pt-6 pb-16"
    >
      <header className="mb-6">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream transition mb-2 inline-block"
        >
          ← {event.name}
        </Link>
        <h1 className="font-display text-4xl md:text-5xl text-cream uppercase tracking-wide leading-[0.9]">
          Event settings
        </h1>
        <p className="label-mono mt-2">
          Name, flyer, nights, capacity, lockdown — anything you can change before doors.
        </p>
      </header>

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
