import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import { computeExtraAnalytics } from "@/lib/analytics-extra";

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
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">Nothing to chart</div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 480,
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          Run a night. The next morning, every chart on this page tells you
          who came, who didn&apos;t, and who&apos;s worth booking again.
        </p>
      </div>
    );
  }

  function fmtHourLabel(h: number): string {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d
      .toLocaleTimeString("en-US", { hour: "numeric" })
      .toLowerCase();
  }

  const dwellH = Math.floor(x.avgDwellMin / 60);
  const dwellM = x.avgDwellMin % 60;
  const showRatePct = Math.round(a.showRate * 100);
  const noShowPct = Math.round((1 - a.showRate) * 100);
  const peakNight = Math.max(1, ...a.trend.map((p) => p.scanned));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top KPI strip */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <KPI
          label="TOTAL EVENTS"
          value={a.byVenue.reduce((s, v) => s + v.events, 0)}
        />
        <KPI label="TOTAL GUESTS" value={a.totalScanned} tone="ok" />
        <KPI label="SHOW RATE" value={`${showRatePct}%`} accent />
        <KPI label="NO-SHOW RATE" value={`${noShowPct}%`} tone="err" />
      </section>

      {/* Best/peak strip */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {x.bestNight && (
          <div className="w-card" style={{ padding: 18 }}>
            <div className="w-type-meta">BEST NIGHT</div>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "-0.025em",
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {x.bestNight.label}
            </div>
            <div className="w-type-meta" style={{ marginTop: 6 }}>
              AVG {x.bestNight.avg} CHECKED IN
            </div>
          </div>
        )}
        {x.bestEvent && (
          <div className="w-card" style={{ padding: 18 }}>
            <div className="w-type-meta">BEST EVENT</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                marginTop: 8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {x.bestEvent.name}
            </div>
            <div className="w-type-meta" style={{ marginTop: 6 }}>
              {x.bestEvent.count} CHECK-INS
            </div>
          </div>
        )}
        {x.peakHour && (
          <div className="w-card" style={{ padding: 18 }}>
            <div className="w-type-meta">PEAK HOUR</div>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "-0.025em",
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {fmtHourLabel(x.peakHour.hour)}
            </div>
            <div className="w-type-meta" style={{ marginTop: 6 }}>
              {Math.round(x.peakHour.pct * 100)}% OF ALL CHECK-INS
            </div>
          </div>
        )}
        <div className="w-card" style={{ padding: 18 }}>
          <div className="w-type-meta">AVG DWELL TIME</div>
          <div
            style={{
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            {x.avgDwellMin > 0 ? `${dwellH}h ${dwellM}m` : "—"}
          </div>
          <div className="w-type-meta" style={{ marginTop: 6 }}>
            FIRST SCAN → LAST SCAN, AVERAGED
          </div>
        </div>
      </section>

      {/* Attendance trend */}
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta">ATTENDANCE TREND · 90 DAYS</div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 128,
            marginTop: 14,
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
                    t.scanned === peakNight
                      ? "var(--w-acc)"
                      : "oklch(0.86 0.18 145 / 0.6)",
                }}
              />
            </div>
          ))}
        </div>
        <div
          className="w-type-meta"
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{a.trend[0]?.date}</span>
          <span>{a.trend[a.trend.length - 1]?.date}</span>
        </div>
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "err";
  accent?: boolean;
}) {
  const valueColor =
    tone === "ok"
      ? "var(--w-ok)"
      : tone === "err"
        ? "var(--w-err)"
        : "var(--w-fg)";
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 8,
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}
