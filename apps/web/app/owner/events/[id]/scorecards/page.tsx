import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import ScorecardRow from "@/components/scorecard-row";

export const dynamic = "force-dynamic";

export default async function EventScorecardsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const cards = await computeScorecards(account.id, event.id);

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={`/owner/events/${event.id}`}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta">SCORECARDS</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{event.name}</div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Single-event leaderboard · sorted by show rate
          </p>
        </div>

        {cards.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No scorecard data yet</div>
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
              Approve and scan in some guests, then come back to see who&apos;s
              pulling weight.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cards.map((c, i) => (
              <ScorecardRow
                key={c.key}
                card={c}
                rank={i + 1}
                href={`/owner/scorecards/${encodeURIComponent(c.key)}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
