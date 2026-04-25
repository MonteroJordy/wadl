import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import ScorecardRow from "@/components/scorecard-row";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function EventScorecardsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const cards = await computeScorecards(account.id, event.id);

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream transition"
        >
          ← Back
        </Link>
        <p className="label-mono">Scorecards</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        Single-event leaderboard · sorted by show rate
      </p>

      {cards.length === 0 ? (
        <EmptyState
          title="No scorecard data yet"
          body="Approve and scan in some guests, then come back to see who's pulling weight."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((c, i) => (
            <ScorecardRow
              key={c.key}
              card={c}
              rank={i + 1}
              href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
