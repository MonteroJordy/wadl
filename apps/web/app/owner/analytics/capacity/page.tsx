import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import EmptyState from "@/components/empty-state";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capacity — WADL" };

const STATUS_TONE: Record<string, string> = {
  sold_out: "text-coral",
  near_cap: "text-gold",
  normal: "text-cream",
  low: "text-muted",
};

const STATUS_LABEL: Record<string, string> = {
  sold_out: "Sold out",
  near_cap: "Near cap",
  normal: "Normal",
  low: "Low",
};

export default async function CapacityAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const x = await computeExtraAnalytics(account.id);

  if (x.capacityRows.length === 0)
    return <EmptyState title="Set caps to plot" body="Drop a capacity number on each night in event settings. The how-full-was-it chart populates after the first run." />;

  const withCap = x.capacityRows.filter((r) => r.cap > 0);
  const avgUtil =
    withCap.length === 0
      ? 0
      : withCap.reduce((s, r) => s + r.pct, 0) / withCap.length;
  const soldOut = withCap.filter((r) => r.status === "sold_out").length;

  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-3 gap-3">
        <div className="card">
          <p className="label-mono">Avg utilization</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {Math.round(avgUtil * 100)}%
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Sold out</p>
          <p className="font-display text-3xl text-coral leading-none mt-1">
            {soldOut}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Unused spots</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {withCap.reduce((s, r) => s + Math.max(0, r.cap - r.in_count), 0)}
          </p>
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">Capacity by event-night</p>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-2">Date</th>
                <th>Event</th>
                <th className="text-right">In</th>
                <th className="text-right">Cap</th>
                <th className="text-right">Util</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {x.capacityRows.map((r) => (
                <tr key={`${r.event_id}-${r.date}`} className="border-t border-line">
                  <td className="py-2 label-mono">{fmtDate(r.date)}</td>
                  <td className="py-2 text-cream truncate">
                    <Link
                      href={`/owner/events/${r.event_id}`}
                      className="hover:underline"
                    >
                      {r.event_name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{r.in_count}</td>
                  <td className="py-2 text-right">{r.cap || "—"}</td>
                  <td className="py-2 text-right">
                    {r.cap > 0 ? Math.round(r.pct * 100) + "%" : "—"}
                  </td>
                  <td className={`py-2 text-right label-mono ${STATUS_TONE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
