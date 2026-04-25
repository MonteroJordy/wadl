import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import ScorecardRow from "@/components/scorecard-row";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ScorecardsPage() {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <p className="label-mono mb-1">Scorecards</p>
      <h1 className="display-lg leading-[0.95]">Leaderboard</h1>
      <p className="label-mono mt-2 mb-6">
        Cross-event · sorted by show rate, then volume
      </p>

      {cards.length === 0 ? (
        <EmptyState
          title="No scorecard data yet"
          body="Once allocations have approved guests with scanned check-ins, holders show up here ranked."
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
