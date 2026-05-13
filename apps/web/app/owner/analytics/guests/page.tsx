import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
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
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">No regulars yet</div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 460,
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          First-timers, returning, regulars — the cohort math kicks in after
          a few nights with check-ins.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <KPI
          label="RETURNING GUESTS"
          value={`${Math.round(x.retentionRate * 100)}%`}
          sub="ATTENDED ≥2 EVENTS IN WINDOW"
          accent
        />
        <KPI
          label="FIRST-TIMERS"
          value={x.segments.first_timers}
          tone="ok"
        />
        <KPI
          label="REGULARS · 4+ ATTENDED"
          value={x.segments.regulars}
          tone="acc"
        />
      </section>

      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 12 }}>
          SEGMENTS
        </div>
        <div
          style={{
            display: "flex",
            height: 40,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: `${x.segments.pct.first_timers}%`,
              background: "var(--w-fg)",
            }}
            title={`First-timers ${x.segments.pct.first_timers}%`}
          />
          <div
            style={{
              width: `${x.segments.pct.returning}%`,
              background: "var(--w-ok)",
            }}
            title={`Returning ${x.segments.pct.returning}%`}
          />
          <div
            style={{
              width: `${x.segments.pct.regulars}%`,
              background: "var(--w-acc)",
            }}
            title={`Regulars ${x.segments.pct.regulars}%`}
          />
        </div>
        <div
          className="w-type-meta"
          style={{ display: "flex", flexWrap: "wrap", gap: 12 }}
        >
          <span>
            <span style={{ color: "var(--w-fg)" }}>FIRST-TIMERS</span>{" "}
            {x.segments.pct.first_timers}%
          </span>
          <span>
            <span style={{ color: "var(--w-ok)" }}>RETURNING</span>{" "}
            {x.segments.pct.returning}%
          </span>
          <span>
            <span style={{ color: "var(--w-acc)" }}>REGULARS</span>{" "}
            {x.segments.pct.regulars}%
          </span>
        </div>
      </section>

      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          TOP RETURNING GUESTS
        </div>
        {x.topGuests.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            No repeat guests yet.
          </p>
        ) : (
          <div
            style={{ overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}
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
                  {["NAME", "PHONE", "EVENTS", "AVG TIER", "LAST SEEN"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className="w-type-meta"
                        style={{
                          textAlign: i >= 2 ? "right" : "left",
                          paddingBottom: 8,
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
                    style={{ borderTop: "1px solid var(--w-line)" }}
                  >
                    <td style={{ padding: "10px 0" }}>{g.full_name}</td>
                    <td
                      style={{
                        padding: "10px 0",
                        fontFamily: "var(--w-mono)",
                        fontSize: 12,
                      }}
                    >
                      {g.phone ?? "—"}
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>
                      {g.events_attended}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0", textAlign: "right" }}
                    >
                      {g.avg_tier}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0", textAlign: "right" }}
                    >
                      {fmtDate(g.last_seen).toUpperCase()}
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

function KPI({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "ok" | "acc";
  accent?: boolean;
}) {
  const valueColor =
    tone === "ok"
      ? "var(--w-ok)"
      : tone === "acc"
        ? "var(--w-acc)"
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
      {sub && (
        <div className="w-type-meta" style={{ marginTop: 8 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
