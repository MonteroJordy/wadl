import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeExtraAnalytics } from "@/lib/analytics-extra";
import { Chip } from "@/components/wadl";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capacity — WADL" };

const STATUS_TONE: Record<
  string,
  "err" | "warn" | "ok" | "ghost"
> = {
  sold_out: "err",
  near_cap: "warn",
  normal: "ok",
  low: "ghost",
};

const STATUS_LABEL: Record<string, string> = {
  sold_out: "SOLD OUT",
  near_cap: "NEAR CAP",
  normal: "NORMAL",
  low: "LOW",
};

export default async function CapacityAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const x = await computeExtraAnalytics(account.id);

  if (x.capacityRows.length === 0) {
    return (
      <div
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">Set caps to plot</div>
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
          label="AVG UTILIZATION"
          value={`${Math.round(avgUtil * 100)}%`}
          accent
        />
        <KPI label="SOLD OUT" value={soldOut} tone="err" />
        <KPI label="UNUSED SPOTS" value={unused} />
      </section>

      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          CAPACITY BY EVENT-NIGHT
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
                  ["IN", "right"],
                  ["CAP", "right"],
                  ["UTIL", "right"],
                  ["STATUS", "right"],
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
              {x.capacityRows.map((r) => (
                <tr
                  key={`${r.event_id}-${r.date}`}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td
                    className="w-type-meta"
                    style={{ padding: "10px 0" }}
                  >
                    {fmtDate(r.date).toUpperCase()}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <Link
                      href={`/owner/events/${r.event_id}`}
                      style={{
                        color: "var(--w-fg)",
                        textDecoration: "none",
                      }}
                    >
                      {r.event_name}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {r.in_count}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {r.cap || "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {r.cap > 0 ? Math.round(r.pct * 100) + "%" : "—"}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    <Chip tone={STATUS_TONE[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </Chip>
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

function KPI({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: number | string;
  tone?: "err";
  accent?: boolean;
}) {
  const valueColor = tone === "err" ? "var(--w-err)" : "var(--w-fg)";
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
