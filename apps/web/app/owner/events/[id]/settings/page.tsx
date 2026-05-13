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
    .select(
      "id, name, description, flyer_url, account_id, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct)",
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();

  if (!event) notFound();

  const nights = (
    (event.event_nights ?? []) as Array<{
      id: string;
      night_date: string;
      doors_at: string;
      cutoff_at: string | null;
      capacity_cap: number | null;
      lockdown_threshold_pct: number;
    }>
  ).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          ← {event.name.toUpperCase()}
        </Link>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginTop: 16,
          }}
        >
          <div className="w-type-meta">EVENT SETTINGS</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Configure
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              maxWidth: 560,
            }}
          >
            Name, flyer, nights, capacity, lockdown — anything you can change
            before doors.
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <SettingsForm
            eventId={event.id}
            initial={{
              name: event.name,
              description: event.description ?? "",
              flyer_url: event.flyer_url ?? "",
            }}
            nights={nights}
          />
        </div>
      </div>
    </main>
  );
}
