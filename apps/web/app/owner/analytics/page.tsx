import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage() {
  const { account } = await requireOwnerContext();
  const [a, x] = await Promise.all([
    computeAccountAnalytics(account.id),
    computeExtraAnalytics(account.id),
  ]);

  if (a.trend.length === 0) {
    return (
      <EmptyState
        title="Nothing to chart"
        body="Run a night. The next morning, every chart on this page tells you who came, who didn't, and who's worth booking again."
      />
    );
  }

  function fmtHourLabel(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase();
  }

  const dwellH = Math.floor(x.avgDwellMin / 60);
  const dwellM = x.avgDwellMin % 60;

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <p className="label-mono">Total events</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {a.byVenue.reduce((s, v) => s + v.events, 0)}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Total guests</p>
          <p className="font-display text-3xl text-mint leading-none mt-1">
            {a.totalScanned}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Show rate</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {Math.round(a.showRate * 100)}%
          </p>
        </div>
        <div className="card">
          <p className="label-mono">No-show rate</p>
          <p className="font-display text-3xl text-coral leading-none mt-1">
            {Math.round((1 - a.showRate) * 100)}%
          </p>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-3">
        {x.bestNight && (
          <div className="card">
            <p className="label-mono">Best night</p>
            <p className="font-display text-2xl text-cream leading-none mt-1">
              {x.bestNight.label}
            </p>
            <p className="label-mono mt-1">avg {x.bestNight.avg} checked in</p>
          </div>
        )}
        {x.bestEvent && (
          <div className="card">
            <p className="label-mono">Best event</p>
            <p className="font-sans text-cream font-semibold truncate mt-1">
              {x.bestEvent.name}
            </p>
            <p className="label-mono mt-1">{x.bestEvent.count} check-ins</p>
          </div>
        )}
        {x.peakHour && (
          <div className="card">
            <p className="label-mono">Peak hour</p>
            <p className="font-display text-2xl text-cream leading-none mt-1">
              {fmtHourLabel(x.peakHour.hour)}
            </p>
            <p className="label-mono mt-1">
              {Math.round(x.peakHour.pct * 100)}% of all check-ins
            </p>
          </div>
        )}
        <div className="card md:col-span-3">
          <p className="label-mono">Avg dwell time</p>
          <p className="font-display text-2xl text-cream leading-none mt-1">
            {x.avgDwellMin > 0 ? `${dwellH}h ${dwellM}m` : "—"}
          </p>
          <p className="label-mono mt-1">first scan → last scan, averaged</p>
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Attendance trend (90d)</p>
        <div className="flex items-end gap-1 h-28">
          {a.trend.map((t) => {
            const peakNight = Math.max(1, ...a.trend.map((p) => p.scanned));
            return (
              <div
                key={t.date}
                className="flex-1 flex flex-col items-center gap-1 min-w-[6px]"
                title={`${t.date}: ${t.scanned} scanned`}
              >
                <div
                  className="w-full rounded-t bg-mint/60"
                  style={{ height: `${(t.scanned / peakNight) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <p className="label-mono mt-2">
          {a.trend[0]?.date} → {a.trend[a.trend.length - 1]?.date}
        </p>
      </section>
    </div>
  );
}
