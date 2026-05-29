import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import { Stat } from "@/components/v5";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guest intelligence — WADL" };

export default async function GuestsAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const x = await computeExtraAnalytics(account.id);

  if (
    x.segments.first_timers + x.segments.returning + x.segments.regulars ===
    0
  ) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
      >
        <div className="t-display-sm">No regulars yet</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 460,
            marginInline: "auto",
          }}
        >
          First-timers, returning, regulars — the cohort math kicks in after a
          few nights with check-ins.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <div
        className="card"
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        <Stat
          label="Returning guests"
          value={`${Math.round(x.retentionRate * 100)}%`}
          sub="attended ≥2 events in window"
        />
        <Stat
          label="First-timers"
          value={x.segments.first_timers}
          sub="brand new this window"
        />
        <Stat
          label="Regulars · 4+"
          value={x.segments.regulars}
          sub="your loyal core"
          last
        />
      </div>

      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          Segments
        </div>
        <div
          style={{
            display: "flex",
            height: 40,
            overflow: "hidden",
            marginBottom: "var(--s-3)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div
            style={{
              width: `${x.segments.pct.first_timers}%`,
              background: "var(--fg)",
            }}
            title={`First-timers ${x.segments.pct.first_timers}%`}
          />
          <div
            style={{
              width: `${x.segments.pct.returning}%`,
              background: "var(--fg-3)",
            }}
            title={`Returning ${x.segments.pct.returning}%`}
          />
          <div
            style={{
              width: `${x.segments.pct.regulars}%`,
              background: "var(--bg-4)",
            }}
            title={`Regulars ${x.segments.pct.regulars}%`}
          />
        </div>
        <div
          className="t-meta"
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)" }}
        >
          <span>
            <span style={{ color: "var(--fg)" }}>First-timers</span>{" "}
            {x.segments.pct.first_timers}%
          </span>
          <span>
            <span style={{ color: "var(--fg-2)" }}>Returning</span>{" "}
            {x.segments.pct.returning}%
          </span>
          <span>Regulars {x.segments.pct.regulars}%</span>
        </div>
      </div>

      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Top returning guests
        </div>
        {x.topGuests.length === 0 ? (
          <p className="t-body-2">No repeat guests yet.</p>
        ) : (
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
                  {["Name", "Phone", "Events", "Avg tier", "Last seen"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className="t-meta"
                        style={{
                          textAlign: i >= 2 ? "right" : "left",
                          paddingBottom: "var(--s-2)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {x.topGuests.map((g) => (
                  <tr
                    key={g.phone ?? g.full_name}
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <td
                      className="t-body"
                      style={{ padding: "var(--s-3) 0" }}
                    >
                      {g.full_name}
                    </td>
                    <td
                      className="t-body-2 t-num"
                      style={{
                        padding: "var(--s-3) 0",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {g.phone ?? "—"}
                    </td>
                    <td
                      className="t-body t-num"
                      style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                    >
                      {g.events_attended}
                    </td>
                    <td
                      className="t-meta"
                      style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                    >
                      {g.avg_tier}
                    </td>
                    <td
                      className="t-meta"
                      style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                    >
                      {fmtDate(g.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
