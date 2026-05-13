import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import { Chip } from "@/components/wadl";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scorecards — WADL" };

const GRADE_COLOR: Record<string, string> = {
  A: "var(--w-ok)",
  B: "var(--w-fg)",
  C: "var(--w-warn)",
  D: "var(--w-err)",
};

export default async function ScorecardsAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);

  if (cards.length === 0) {
    return (
      <div
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">No promoters graded</div>
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
          Allocations + check-ins → grades. Drop a magic link, run a night,
          the rankings sort themselves.
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
      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          SHOW RATE BY PROMOTER
        </div>
        <div style={{ overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  ["#", "left"],
                  ["HOLDER", "left"],
                  ["EVENTS", "right"],
                  ["APPROVED", "right"],
                  ["SCANNED", "right"],
                  ["SHOW", "right"],
                  ["GRADE", "right"],
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
              {cards.map((c, i) => (
                <tr
                  key={c.key}
                  style={{ borderTop: "1px solid var(--w-line)" }}
                >
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--w-fg-dim)",
                      fontFamily: "var(--w-mono)",
                      fontSize: 12,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <Link
                      href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
                      style={{
                        color: "var(--w-fg)",
                        textDecoration: "none",
                      }}
                    >
                      {c.display_name}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {c.events_played}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {c.approved}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--w-ok)",
                    }}
                  >
                    {c.scanned}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {Math.round(c.show_rate * 100)}%
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 18,
                      color: GRADE_COLOR[c.grade] ?? "var(--w-fg)",
                    }}
                  >
                    {c.grade}
                    {c.trend === "up" && " ↑"}
                    {c.trend === "down" && " ↓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div
        className="w-type-meta"
        style={{ color: "var(--w-fg-dim)" }}
      >
        DRILL INTO A HOLDER FOR TIER MIX + PER-TIER CONVERSION ON{" "}
        <Link
          href="/owner/scorecards"
          style={{ color: "var(--w-acc)", textDecoration: "none" }}
        >
          /OWNER/SCORECARDS
        </Link>
      </div>
    </div>
  );
}
