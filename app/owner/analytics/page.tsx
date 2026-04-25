import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { account } = await requireOwnerContext();
  const a = await computeAccountAnalytics(account.id);

  if (a.trend.length === 0) {
    return (
      <main className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
        <h1 className="display-lg mb-2">Analytics</h1>
        <p className="label-mono mb-6">90-day rolling</p>
        <EmptyState
          title="Nothing yet"
          body="Run an event in the last 90 days and analytics will populate."
        />
      </main>
    );
  }

  const peakNight = Math.max(1, ...a.trend.map((t) => t.scanned));

  return (
    <main className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <header className="mb-6">
        <p className="label-mono mb-1">90-day rolling</p>
        <h1 className="display-lg">Analytics</h1>
      </header>

      <section className="card mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="label-mono">Show rate</p>
            <p className="font-display text-3xl text-cream leading-none">
              {Math.round(a.showRate * 100)}%
            </p>
          </div>
          <div>
            <p className="label-mono">Scanned</p>
            <p className="font-display text-3xl text-mint leading-none">
              {a.totalScanned}
            </p>
          </div>
          <div>
            <p className="label-mono">Approved</p>
            <p className="font-display text-3xl text-cream leading-none">
              {a.totalApproved}
            </p>
          </div>
        </div>
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-3">Attendance trend</p>
        <div className="flex items-end gap-1 h-28">
          {a.trend.map((t) => (
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
          ))}
        </div>
        <p className="label-mono mt-2">
          {a.trend[0]?.date} → {a.trend[a.trend.length - 1]?.date}
        </p>
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-3">By day of week</p>
        <div className="flex items-end gap-2 h-20">
          {a.byDow.map((d) => {
            const peak = Math.max(1, ...a.byDow.map((x) => x.scanned));
            const isBest = a.bestDow?.dow === d.dow && d.events > 0;
            return (
              <div
                key={d.dow}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${d.label}: ${d.scanned} scanned across ${d.events} event${d.events === 1 ? "" : "s"}`}
              >
                <div
                  className={`w-full rounded-t ${isBest ? "bg-coral" : "bg-mint/60"}`}
                  style={{ height: `${Math.max(4, (d.scanned / peak) * 100)}%` }}
                />
                <p className="label-mono text-[9px]">{d.label}</p>
              </div>
            );
          })}
        </div>
        {a.bestDow && a.bestDow.events > 0 && (
          <p className="label-mono mt-3">
            Best day: <span className="text-cream">{a.bestDow.label}</span>{" "}
            avg {Math.round(a.bestDow.scanned / Math.max(1, a.bestDow.events))} scanned
          </p>
        )}
      </section>

      <section className="card mb-4">
        <p className="label-mono mb-3">By venue</p>
        {a.byVenue.length === 0 ? (
          <p className="text-muted text-sm">No venue activity.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {a.byVenue.map((v) => (
              <li
                key={v.venue_id ?? "no_venue"}
                className="flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-sans text-cream truncate">{v.venue_name}</p>
                  <p className="label-mono mt-0.5">
                    {v.events} event{v.events === 1 ? "" : "s"} ·{" "}
                    {Math.round(v.show_rate * 100)}% show
                  </p>
                </div>
                <p className="font-display text-2xl text-cream">{v.scanned}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <p className="label-mono mb-3">Top promoters by consistency</p>
        {a.topHolders.length === 0 ? (
          <p className="text-muted text-sm">No promoter data yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {a.topHolders.map((h, i) => (
              <li
                key={h.name + i}
                className="flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-sans text-cream truncate">
                    <span className="text-muted">{i + 1}.</span> {h.name}
                  </p>
                  <p className="label-mono mt-0.5">
                    {h.events} events · {Math.round(h.show_rate * 100)}% show
                  </p>
                </div>
                <p className="font-display text-xl text-mint">{h.scanned}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
