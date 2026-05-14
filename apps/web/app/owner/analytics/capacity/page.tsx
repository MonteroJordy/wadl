import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import { Stat } from "@/components/v5";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capacity — WADL" };

const STATUS_CHIP: Record<string, string> = {
  sold_out: "chip chip--err",
  near_cap: "chip chip--warn",
  normal: "chip chip--ok",
  low: "chip chip--ghost",
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

  if (x.capacityRows.length === 0) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
      >
        <div className="t-display-sm">Set caps to plot</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 460,
            marginInline: "auto",
          }}
        >
          Drop a capacity number on each night in event settings. The
          how-full-was-it chart populates after the first run.
        </p>
      </div>
    );
  }

  const withCap = x.capacityRows.filter((r) => r.cap > 0);
  const avgUtil =
    withCap.length === 0
      ? 0
      : withCap.reduce((s, r) => s + r.pct, 0) / withCap.length;
  const soldOut = withCap.filter((r) => r.status === "sold_out").length;
  const unused = withCap.reduce(
    (s, r) => s + Math.max(0, r.cap - r.in_count),
    0,
  );

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
          label="Avg utilization"
          value={`${Math.round(avgUtil * 100)}%`}
          sub="across nights with a cap"
        />
        <Stat label="Sold out" value={soldOut} sub="nights at capacity" />
        <Stat label="Unused spots" value={unused} sub="seats left empty" last />
      </div>

      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Capacity by event-night
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
                  ["In", "right"],
                  ["Cap", "right"],
                  ["Util", "right"],
                  ["Status", "right"],
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
              {x.capacityRows.map((r) => (
                <tr
                  key={`${r.event_id}-${r.date}`}
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <td className="t-meta" style={{ padding: "var(--s-3) 0" }}>
                    {fmtDate(r.date)}
                  </td>
                  <td style={{ padding: "var(--s-3) 0" }}>
                    <Link
                      href={`/owner/events/${r.event_id}`}
                      className="t-body"
                      style={{ color: "var(--fg)", textDecoration: "none" }}
                    >
                      {r.event_name}
                    </Link>
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {r.in_count}
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {r.cap || "—"}
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {r.cap > 0 ? Math.round(r.pct * 100) + "%" : "—"}
                  </td>
                  <td style={{ padding: "var(--s-3) 0", textAlign: "right" }}>
                    <span className={STATUS_CHIP[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </span>
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
