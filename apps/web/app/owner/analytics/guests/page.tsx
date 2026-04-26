import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import EmptyState from "@/components/empty-state";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guest intelligence — WADL" };

export default async function GuestsAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const x = await computeExtraAnalytics(account.id);

  if (x.segments.first_timers + x.segments.returning + x.segments.regulars === 0) {
    return <EmptyState title="No regulars yet" body="First-timers, returning, regulars — the cohort math kicks in after a few nights with check-ins." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card">
          <p className="label-mono">Returning guests</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {Math.round(x.retentionRate * 100)}%
          </p>
          <p className="label-mono mt-1">attended ≥2 events in window</p>
        </div>
        <div className="card">
          <p className="label-mono">First-timers</p>
          <p className="font-display text-3xl text-mint leading-none mt-1">
            {x.segments.first_timers}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Regulars (4+)</p>
          <p className="font-display text-3xl text-coral leading-none mt-1">
            {x.segments.regulars}
          </p>
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Segments</p>
        <div className="flex h-10 rounded overflow-hidden mb-3">
          <div
            className="bg-cream"
            style={{ width: `${x.segments.pct.first_timers}%` }}
            title={`First-timers ${x.segments.pct.first_timers}%`}
          />
          <div
            className="bg-mint"
            style={{ width: `${x.segments.pct.returning}%` }}
            title={`Returning ${x.segments.pct.returning}%`}
          />
          <div
            className="bg-coral"
            style={{ width: `${x.segments.pct.regulars}%` }}
            title={`Regulars ${x.segments.pct.regulars}%`}
          />
        </div>
        <p className="label-mono">
          First-timers {x.segments.pct.first_timers}% ·{" "}
          <span className="text-mint">Returning</span> {x.segments.pct.returning}% ·{" "}
          <span className="text-coral">Regulars</span> {x.segments.pct.regulars}%
        </p>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Top returning guests</p>
        {x.topGuests.length === 0 ? (
          <p className="text-muted text-sm">No repeat guests yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead className="label-mono text-left">
                <tr>
                  <th className="pb-2">Name</th>
                  <th>Phone</th>
                  <th className="text-right">Events</th>
                  <th className="text-right">Avg tier</th>
                  <th className="text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {x.topGuests.map((g) => (
                  <tr key={g.phone ?? g.full_name} className="border-t border-line">
                    <td className="py-2 text-cream">{g.full_name}</td>
                    <td className="py-2 font-mono text-xs">{g.phone ?? "—"}</td>
                    <td className="py-2 text-right">{g.events_attended}</td>
                    <td className="py-2 text-right label-mono">{g.avg_tier}</td>
                    <td className="py-2 text-right label-mono">
                      {fmtDate(g.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
