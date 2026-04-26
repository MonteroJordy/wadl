import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scorecards — WADL" };

const GRADE_COLOR: Record<string, string> = {
  A: "text-mint",
  B: "text-cream",
  C: "text-gold",
  D: "text-coral",
};

export default async function ScorecardsAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);

  if (cards.length === 0)
    return <EmptyState title="No promoters graded" body="Allocations + check-ins → grades. Drop a magic link, run a night, the rankings sort themselves." />;

  return (
    <div className="flex flex-col gap-3">
      <section className="card">
        <p className="label-mono mb-3">Show rate by promoter</p>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-2">#</th>
                <th>Holder</th>
                <th className="text-right">Events</th>
                <th className="text-right">Approved</th>
                <th className="text-right">Scanned</th>
                <th className="text-right">Show</th>
                <th className="text-right">Grade</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => (
                <tr key={c.key} className="border-t border-line">
                  <td className="py-2 text-muted">{i + 1}</td>
                  <td className="py-2 text-cream truncate">
                    <Link
                      href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
                      className="hover:underline"
                    >
                      {c.display_name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{c.events_played}</td>
                  <td className="py-2 text-right">{c.approved}</td>
                  <td className="py-2 text-right text-mint">{c.scanned}</td>
                  <td className="py-2 text-right">
                    {Math.round(c.show_rate * 100)}%
                  </td>
                  <td className={`py-2 text-right font-display ${GRADE_COLOR[c.grade] ?? ""}`}>
                    {c.grade}
                    {c.trend === "up" && " ↑"}
                    {c.trend === "down" && " ↓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="label-mono">
        Drill into a holder for trend + tier mix on{" "}
        <Link href="/owner/scorecards" className="text-coral hover:text-cream">
          /owner/scorecards
        </Link>
        .
      </p>
    </div>
  );
}
