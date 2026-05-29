import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import { computeExtraAnalytics } from "@/lib/analytics-extra";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance — WADL" };

function fmtHourLabel(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric" }).toLowerCase();
}

export default async function AttendancePage() {
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
        <div className="t-display-sm">Nothing to plot</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          Run a night in the last 90 days. Attendance, show rate, tier mix all
          show up here once a door&apos;s been open.
        </p>
      </div>
    );
  }

  const byMonth = new Map<string, number>();
  for (const t of a.trend) {
    const ym = t.date.slice(0, 7);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + t.scanned);
  }
  const monthly = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, scanned]) => ({ month, scanned }));
  const peakMonth = Math.max(1, ...monthly.map((m) => m.scanned));

  // Tier breakdown — visual estimate per legacy comment.
  const tierMix = { ga: 68, vip: 25, all_access: 7 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Monthly bars */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Monthly attendance
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "var(--s-3)",
            height: 128,
          }}
        >
          {monthly.map((m) => (
            <div
              key={m.month}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--s-1)",
                minWidth: 40,
              }}
              title={`${m.month}: ${m.scanned}`}
            >
              <div className="t-meta" style={{ color: "var(--fg)" }}>
                {m.scanned}
              </div>
              <div
                style={{
                  width: "100%",
                  height: `${(m.scanned / peakMonth) * 100}%`,
                  background:
                    m.scanned === peakMonth ? "var(--fg)" : "var(--fg-4)",
                }}
              />
              <div className="t-meta">{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DOW + hour velocity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
            Day-of-week performance
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--s-2)",
              height: 96,
            }}
          >
            {a.byDow.map((d) => {
              const peak = Math.max(1, ...a.byDow.map((x) => x.scanned));
              const isBest = a.bestDow?.dow === d.dow && d.events > 0;
              return (
                <div
                  key={d.dow}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "var(--s-1)",
                  }}
                  title={`${d.label}: ${d.scanned} scanned across ${d.events} event${d.events === 1 ? "" : "s"}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(4, (d.scanned / peak) * 100)}%`,
                      background: isBest ? "var(--fg)" : "var(--fg-4)",
                    }}
                  />
                  <div className="t-meta" style={{ fontSize: 9 }}>
                    {d.label.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
          {a.bestDow && a.bestDow.events > 0 && (
            <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
              Best:{" "}
              <span style={{ color: "var(--fg)" }}>
                {a.bestDow.label.toUpperCase()}
              </span>{" "}
              · avg{" "}
              {Math.round(a.bestDow.scanned / Math.max(1, a.bestDow.events))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
            Check-in velocity by hour
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--s-1)",
              height: 96,
            }}
          >
            {x.hourVelocity.map((h) => {
              const peak = Math.max(1, ...x.hourVelocity.map((p) => p.count));
              const isPeak = h.count === peak && h.count > 0;
              return (
                <div
                  key={h.hour}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "var(--s-1)",
                    minWidth: 10,
                  }}
                  title={`${fmtHourLabel(h.hour)}: ${h.count}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(h.count / peak) * 100}%`,
                      background: isPeak ? "var(--fg)" : "var(--fg-4)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {x.peakHour && (
            <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
              Peak{" "}
              <span style={{ color: "var(--fg)" }}>
                {fmtHourLabel(x.peakHour.hour).toUpperCase()}
              </span>{" "}
              · {Math.round(x.peakHour.pct * 100)}% of check-ins
            </div>
          )}
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "var(--s-4)",
            gap: "var(--s-3)",
          }}
        >
          <div className="t-meta">Tier breakdown · estimate</div>
          <div style={{ display: "flex", gap: "var(--s-1)" }}>
            <span className="chip">GA</span>
            <span className="chip">VIP</span>
            <span className="chip">AAA</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 32,
            overflow: "hidden",
            marginBottom: "var(--s-3)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div
            style={{ width: `${tierMix.ga}%`, background: "var(--fg)" }}
            title={`GA ${tierMix.ga}%`}
          />
          <div
            style={{ width: `${tierMix.vip}%`, background: "var(--fg-3)" }}
            title={`VIP ${tierMix.vip}%`}
          />
          <div
            style={{
              width: `${tierMix.all_access}%`,
              background: "var(--bg-4)",
            }}
            title={`AAA ${tierMix.all_access}%`}
          />
        </div>
        <div
          className="t-meta"
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)" }}
        >
          <span>
            <span style={{ color: "var(--fg)" }}>GA</span> {tierMix.ga}%
          </span>
          <span>
            <span style={{ color: "var(--fg-2)" }}>VIP</span> {tierMix.vip}%
          </span>
          <span>AAA {tierMix.all_access}%</span>
        </div>
        <div
          className="t-meta"
          style={{ marginTop: "var(--s-2)", color: "var(--fg-4)" }}
        >
          (Per-event tier mix lives on each event recap)
        </div>
      </div>

      {/* Per-event table */}
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Per-event breakdown · last 30
        </div>
        <div
          style={{
            overflowX: "auto",
            margin: "0 calc(-1 * var(--s-6))",
            padding: "0 var(--s-6)",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: "var(--ts-md)",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  ["Date", "left"],
                  ["Event", "left"],
                  ["Approved", "right"],
                  ["Scanned", "right"],
                  ["Show", "right"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    className="t-meta"
                    style={{
                      textAlign: align as "left" | "right",
                      paddingBottom: "var(--s-2)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.trend
                .slice(-30)
                .reverse()
                .map((t) => (
                  <tr
                    key={t.date}
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <td className="t-meta" style={{ padding: "var(--s-3) 0" }}>
                      {t.date}
                    </td>
                    <td
                      className="t-body-2"
                      style={{ padding: "var(--s-3) 0" }}
                    >
                      all events
                    </td>
                    <td
                      className="t-body t-num"
                      style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                    >
                      {t.approved}
                    </td>
                    <td
                      className="t-body t-num"
                      style={{
                        padding: "var(--s-3) 0",
                        textAlign: "right",
                        color: "var(--ok)",
                      }}
                    >
                      {t.scanned}
                    </td>
                    <td
                      className="t-body t-num"
                      style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                    >
                      {t.approved > 0
                        ? Math.round((t.scanned / t.approved) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
