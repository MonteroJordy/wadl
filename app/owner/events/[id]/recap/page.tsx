import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { computeRecap, fmtHour } from "@/lib/recap";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function RecapPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, night_date, doors_at, capacity_cap)"
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = ((event.event_nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
    capacity_cap: number | null;
  }>).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  const activeNight =
    nights.find((n) => n.id === searchParams.night) ?? null; // null = whole event

  const recap = await computeRecap(event.id, activeNight?.id);
  const peakCount = recap.peakHour?.count ?? 0;

  const scopeLabel = activeNight
    ? fmtDate(activeNight.night_date)
    : "Whole event";

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={`/owner/events/${event.id}`} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono">Recap</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">{event.name}</h1>
      <p className="label-mono mb-6">{scopeLabel}</p>

      {nights.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Link
            href={`/owner/events/${event.id}/recap`}
            className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
              activeNight === null
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            All nights
          </Link>
          {nights.map((n) => (
            <Link
              key={n.id}
              href={`/owner/events/${event.id}/recap?night=${n.id}`}
              className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                activeNight?.id === n.id
                  ? "border-coral bg-s2 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {fmtDate(n.night_date)}
            </Link>
          ))}
        </div>
      )}

      {recap.totalApproved === 0 ? (
        <EmptyState
          title="No data yet"
          body="Recap fills in once guests are approved and scanned at the door."
        />
      ) : (
        <>
          <section className="card mb-4">
            <p className="label-mono mb-1">Show rate</p>
            <p className="font-display text-7xl leading-none text-coral">
              {pct(recap.showRate)}
            </p>
            <div className="h-2 bg-s3 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-coral"
                style={{ width: `${Math.min(100, recap.showRate * 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div>
                <p className="label-mono">Approved</p>
                <p className="font-display text-2xl text-cream">
                  {recap.totalApproved}
                </p>
              </div>
              <div>
                <p className="label-mono">Scanned in</p>
                <p className="font-display text-2xl text-mint">
                  {recap.totalCheckedIn}
                </p>
              </div>
              <div>
                <p className="label-mono">Cap</p>
                <p className="font-display text-2xl text-muted">
                  {recap.capacity || "—"}
                </p>
              </div>
            </div>
          </section>

          {recap.tiers.length > 0 && (
            <section className="card mb-4">
              <p className="label-mono mb-3">Tier breakdown</p>
              <div className="flex flex-col gap-3">
                {recap.tiers.map((t) => (
                  <div key={t.tier}>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="font-sans text-cream">
                        {t.tier.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="label-mono">
                        <span className="text-mint">{t.checkedIn}</span> /{" "}
                        {t.approved}
                        <span className="text-coral"> · {pct(t.showRate)}</span>
                      </p>
                    </div>
                    <div className="h-1.5 bg-s3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-mint"
                        style={{
                          width: `${Math.min(100, t.showRate * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recap.hourBuckets.length > 0 && (
            <section className="card mb-4">
              <p className="label-mono mb-3">
                Check-ins by hour
                {recap.peakHour && (
                  <>
                    {" · peak "}
                    <span className="text-coral">{fmtHour(recap.peakHour.hour)}</span>
                    {" "}
                    ({recap.peakHour.count})
                  </>
                )}
              </p>
              <div className="flex items-end gap-1 h-24">
                {recap.hourBuckets.map((b) => {
                  const h = peakCount === 0 ? 0 : (b.count / peakCount) * 100;
                  const isPeak = b.hour === recap.peakHour?.hour;
                  return (
                    <div
                      key={b.hour}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${fmtHour(b.hour)}: ${b.count}`}
                    >
                      <div
                        className={`w-full rounded-t ${
                          isPeak ? "bg-coral" : "bg-mint/60"
                        }`}
                        style={{ height: `${Math.max(4, h)}%` }}
                      />
                      <p className="label-mono text-[9px]">{fmtHour(b.hour)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {recap.topHolders.length > 0 && (
            <section className="card mb-4">
              <p className="label-mono mb-3">Top promoters / holders</p>
              <div className="flex flex-col gap-2">
                {recap.topHolders.slice(0, 5).map((h, i) => (
                  <div
                    key={h.allocation_id}
                    className="flex items-center justify-between"
                  >
                    <p className="font-sans text-cream truncate">
                      <span className="text-muted">{i + 1}.</span>{" "}
                      {h.holder_name}
                    </p>
                    <p className="label-mono shrink-0 ml-3">
                      <span className="text-mint">{h.scanned}</span> / {h.approved}
                      <span className="text-muted"> · {pct(h.showRate)}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card mb-4">
            <p className="label-mono mb-2">
              No-shows
              <span className="text-muted"> · {recap.noShows.length}</span>
            </p>
            {recap.noShows.length === 0 ? (
              <p className="text-muted text-sm">Everyone approved scanned in.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recap.noShows.slice(0, 40).map((g) => (
                  <Link
                    key={g.id}
                    href={`/owner/events/${event.id}/guests/${g.id}`}
                    className="flex items-center justify-between hover:bg-s2 -mx-2 px-2 py-1 rounded transition"
                  >
                    <p className="font-sans text-cream truncate">
                      {g.full_name}
                      {g.plus_ones > 0 && (
                        <span className="text-muted"> +{g.plus_ones}</span>
                      )}
                    </p>
                    <p className="label-mono shrink-0 ml-3">
                      {g.tier.toUpperCase()}
                      {g.allocation_name && <> · {g.allocation_name}</>}
                    </p>
                  </Link>
                ))}
                {recap.noShows.length > 40 && (
                  <p className="label-mono mt-2">
                    + {recap.noShows.length - 40} more — see full list in export
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/owner/events/${event.id}/export`}
              className="btn-ghost text-center"
            >
              Export CSV
            </Link>
            <Link
              href={`/owner/events/${event.id}/print`}
              className="btn-ghost text-center"
            >
              Print roster
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
