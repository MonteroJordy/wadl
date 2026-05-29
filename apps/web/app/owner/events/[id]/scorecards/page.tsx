import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeScorecards } from "@/lib/scorecards";
import ScorecardRow from "@/components/scorecard-row";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";

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
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Scorecards",
        ]}
      />
      <PageHeader
        eyebrow="Scorecards"
        title={event.name}
        sub="Single-event leaderboard · sorted by show rate"
      />
      <EventSubNav active="overview" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {cards.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-h1">No scorecard data yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Approve and scan in some guests, then come back to see who&apos;s
              pulling weight.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
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
