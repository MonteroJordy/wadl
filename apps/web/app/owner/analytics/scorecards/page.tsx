import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scorecards — WADL" };

const GRADE_COLOR: Record<string, string> = {
  A: "var(--ok)",
  B: "var(--fg)",
  C: "var(--warn)",
  D: "var(--err)",
};

export default async function ScorecardsAnalyticsPage() {
  const { account } = await requireOwnerContext();
  const cards = await computeScorecards(account.id);

  if (cards.length === 0) {
    return (
      <div
        className="card"
        style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
      >
        <div className="t-display-sm">No promoters graded</div>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          Allocations + check-ins → grades. Drop a magic link, run a night, the
          rankings sort themselves.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <div className="card" style={{ padding: "var(--s-6)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
          Show rate by promoter
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
                  ["#", "left"],
                  ["Holder", "left"],
                  ["Events", "right"],
                  ["Approved", "right"],
                  ["Scanned", "right"],
                  ["Show", "right"],
                  ["Grade", "right"],
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
              {cards.map((c, i) => (
                <tr
                  key={c.key}
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <td
                    className="t-meta t-num"
                    style={{ padding: "var(--s-3) 0", color: "var(--fg-4)" }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ padding: "var(--s-3) 0" }}>
                    <Link
                      href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
                      className="t-body"
                      style={{ color: "var(--fg)", textDecoration: "none" }}
                    >
                      {c.display_name}
                    </Link>
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {c.events_played}
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {c.approved}
                  </td>
                  <td
                    className="t-body t-num"
                    style={{
                      padding: "var(--s-3) 0",
                      textAlign: "right",
                      color: "var(--ok)",
                    }}
                  >
                    {c.scanned}
                  </td>
                  <td
                    className="t-body t-num"
                    style={{ padding: "var(--s-3) 0", textAlign: "right" }}
                  >
                    {Math.round(c.show_rate * 100)}%
                  </td>
                  <td
                    className="t-num"
                    style={{
                      padding: "var(--s-3) 0",
                      textAlign: "right",
                      fontFamily: "var(--display)",
                      fontWeight: 700,
                      fontSize: "var(--ts-lg)",
                      color: GRADE_COLOR[c.grade] ?? "var(--fg)",
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
      </div>

      <div className="t-meta" style={{ color: "var(--fg-4)" }}>
        Drill into a holder for tier mix + per-tier conversion on{" "}
        <Link
          href="/owner/scorecards"
          style={{ color: "var(--fg)", textDecoration: "none" }}
        >
          /owner/scorecards
        </Link>
      </div>
    </div>
  );
}
