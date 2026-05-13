import { requireOwnerContext } from "@/lib/owner";
import { computeAccountAnalytics } from "@/lib/analytics";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import { CredPill } from "@/components/wadl";

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
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">Nothing to plot</div>
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
          Run a night in the last 90 days. Attendance, show rate, tier mix
          all show up here once a door&apos;s been open.
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Monthly bars */}
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          MONTHLY ATTENDANCE
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
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
                gap: 4,
                minWidth: 40,
              }}
              title={`${m.month}: ${m.scanned}`}
            >
              <div
                className="w-type-meta"
                style={{ color: "var(--w-fg)" }}
              >
                {m.scanned}
              </div>
              <div
                style={{
                  width: "100%",
                  height: `${(m.scanned / peakMonth) * 100}%`,
                  background:
                    m.scanned === peakMonth
                      ? "var(--w-acc)"
                      : "oklch(0.7 0.24 260 / 0.4)",
                }}
              />
              <div className="w-type-meta">{m.month}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DOW + hour velocity */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        <div className="w-card" style={{ padding: 20 }}>
          <div className="w-type-meta" style={{ marginBottom: 14 }}>
            DAY-OF-WEEK PERFORMANCE
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
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
                    gap: 4,
                  }}
                  title={`${d.label}: ${d.scanned} scanned across ${d.events} event${d.events === 1 ? "" : "s"}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(4, (d.scanned / peak) * 100)}%`,
                      background: isBest
                        ? "var(--w-acc)"
                        : "oklch(0.86 0.18 145 / 0.6)",
                    }}
                  />
                  <div
                    className="w-type-meta"
                    style={{ fontSize: 9 }}
                  >
                    {d.label.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
          {a.bestDow && a.bestDow.events > 0 && (
            <div className="w-type-meta" style={{ marginTop: 12 }}>
              BEST:{" "}
              <span style={{ color: "var(--w-fg)" }}>
                {a.bestDow.label.toUpperCase()}
              </span>{" "}
              · AVG{" "}
              {Math.round(
                a.bestDow.scanned / Math.max(1, a.bestDow.events),
              )}
            </div>
          )}
        </div>

        <div className="w-card" style={{ padding: 20 }}>
          <div className="w-type-meta" style={{ marginBottom: 14 }}>
            CHECK-IN VELOCITY BY HOUR
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 96,
            }}
          >
            {x.hourVelocity.map((h) => {
              const peak = Math.max(
                1,
                ...x.hourVelocity.map((p) => p.count),
              );
              const isPeak = h.count === peak && h.count > 0;
              return (
                <div
                  key={h.hour}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 10,
                  }}
                  title={`${fmtHourLabel(h.hour)}: ${h.count}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${(h.count / peak) * 100}%`,
                      background: isPeak
                        ? "var(--w-acc)"
                        : "oklch(0.86 0.18 145 / 0.4)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {x.peakHour && (
            <div className="w-type-meta" style={{ marginTop: 12 }}>
              PEAK{" "}
              <span style={{ color: "var(--w-fg)" }}>
                {fmtHourLabel(x.peakHour.hour).toUpperCase()}
              </span>{" "}
              · {Math.round(x.peakHour.pct * 100)}% OF CHECK-INS
            </div>
          )}
        </div>
      </section>

      {/* Tier breakdown */}
      <section className="w-card" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
            gap: 12,
          }}
        >
          <div className="w-type-meta">TIER BREAKDOWN · ESTIMATE</div>
          <div style={{ display: "flex", gap: 6 }}>
            <CredPill tier="GA" />
            <CredPill tier="VIP" />
            <CredPill tier="AAA" />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 32,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: `${tierMix.ga}%`,
              background: "var(--w-fg)",
            }}
            title={`GA ${tierMix.ga}%`}
          />
          <div
            style={{
              width: `${tierMix.vip}%`,
              background: "var(--w-acc)",
            }}
            title={`VIP ${tierMix.vip}%`}
          />
          <div
            className="w-hatch"
            style={{
              width: `${tierMix.all_access}%`,
            }}
            title={`AAA ${tierMix.all_access}%`}
          />
        </div>
        <div
          className="w-type-meta"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          <span>
            <span style={{ color: "var(--w-fg)" }}>GA</span> {tierMix.ga}%
          </span>
          <span>
            <span style={{ color: "var(--w-acc)" }}>VIP</span> {tierMix.vip}%
          </span>
          <span>AAA {tierMix.all_access}%</span>
        </div>
        <div
          className="w-type-meta"
          style={{
            marginTop: 8,
            color: "var(--w-fg-dim)",
          }}
        >
          (PER-EVENT TIER MIX LIVES ON EACH EVENT RECAP)
        </div>
      </section>

      {/* Per-event table */}
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          PER-EVENT BREAKDOWN · LAST 30
        </div>
        <div
          style={{
            overflowX: "auto",
            margin: "0 -20px",
            padding: "0 20px",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 14,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  ["DATE", "left"],
                  ["EVENT", "left"],
                  ["APPROVED", "right"],
                  ["SCANNED", "right"],
                  ["SHOW", "right"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    className="w-type-meta"
                    style={{
                      textAlign: align as "left" | "right",
                      paddingBottom: 8,
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
                    style={{ borderTop: "1px solid var(--w-line)" }}
                  >
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0" }}
                    >
                      {t.date}
                    </td>
                    <td style={{ padding: "10px 0" }}>all events</td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>
                      {t.approved}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        textAlign: "right",
                        color: "var(--w-ok)",
                      }}
                    >
                      {t.scanned}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        textAlign: "right",
                        fontFamily: "var(--w-mono)",
                      }}
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
      </section>
    </div>
  );
}
