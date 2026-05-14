import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import { Stat } from "@/components/v5";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage() {
  const { account } = await requireOwnerContext();
  const [a, x] = await Promise.all([
    computeAccountAnalytics(account.id),
    computeExtraAnalytics(account.id),
  ]);

  if (a.trend.length === 0) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
      >
        <div className="t-display-sm">Nothing to chart</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          Run a night. The next morning, every chart on this page tells you who
          came, who didn&apos;t, and who&apos;s worth booking again.
        </p>
      </div>
    );
  }

  function fmtHourLabel(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase();
  }

  const dwellH = Math.floor(x.avgDwellMin / 60);
  const dwellM = x.avgDwellMin % 60;
  const showRatePct = Math.round(a.showRate * 100);
  const noShowPct = Math.round((1 - a.showRate) * 100);
  const peakNight = Math.max(1, ...a.trend.map((p) => p.scanned));
  const totalEvents = a.byVenue.reduce((s, v) => s + v.events, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Top KPI strip — show rate gets primary prominence */}
      <div
        className="card"
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        <Stat
          label="Show rate"
          value={`${showRatePct}%`}
          sub={`${noShowPct}% no-show · the ROI proof`}
        />
        <Stat label="Total events" value={totalEvents} />
        <Stat label="Total guests" value={a.totalScanned} sub="scanned in" />
        <Stat
          label="Avg dwell"
          value={x.avgDwellMin > 0 ? `${dwellH}h ${dwellM}m` : "—"}
          sub="first → last scan"
          last
        />
      </div>

      {/* Best/peak strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {x.bestNight && (
          <div className="card" style={{ padding: "var(--s-5)" }}>
            <div className="t-meta">Best night</div>
            <div className="t-display-sm" style={{ marginTop: "var(--s-2)" }}>
              {x.bestNight.label}
            </div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              Avg {x.bestNight.avg} checked in
            </div>
          </div>
        )}
        {x.bestEvent && (
          <div className="card" style={{ padding: "var(--s-5)" }}>
            <div className="t-meta">Best event</div>
            <div
              className="t-h1 truncate"
              style={{ marginTop: "var(--s-2)" }}
            >
              {x.bestEvent.name}
            </div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              {x.bestEvent.count} check-ins
            </div>
          </div>
        )}
        {x.peakHour && (
          <div className="card" style={{ padding: "var(--s-5)" }}>
            <div className="t-meta">Peak hour</div>
            <div className="t-display-sm" style={{ marginTop: "var(--s-2)" }}>
              {fmtHourLabel(x.peakHour.hour)}
            </div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              {Math.round(x.peakHour.pct * 100)}% of all check-ins
            </div>
          </div>
        )}
      </div>

      {/* Attendance trend */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta">Attendance trend · 90 days</div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 128,
            marginTop: "var(--s-4)",
          }}
        >
          {a.trend.map((t) => (
            <div
              key={t.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 4,
              }}
              title={`${t.date}: ${t.scanned} scanned`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${(t.scanned / peakNight) * 100}%`,
                  background:
                    t.scanned === peakNight ? "var(--fg)" : "var(--fg-4)",
                }}
              />
            </div>
          ))}
        </div>
        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-3)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{a.trend[0]?.date}</span>
          <span>{a.trend[a.trend.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
