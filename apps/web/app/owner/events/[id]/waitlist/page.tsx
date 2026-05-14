import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import PromoteButton from "./row-buttons";

export const dynamic = "force-dynamic";

interface WaitlistRow {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  created_at: string;
  event_night_id: string;
  allocation: { holder_name: string } | null;
}

export default async function WaitlistPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id, event_nights(id, night_date, doors_at)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = (
    (event.event_nights ?? []) as Array<{
      id: string;
      night_date: string;
      doors_at: string;
    }>
  ).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  const nightIds = nights.map((n) => n.id);
  const { data: rows } = nightIds.length
    ? await supabase
        .from("guests")
        .select(
          "id, full_name, plus_ones, tier, created_at, event_night_id, allocation:allocations(holder_name)",
        )
        .in("event_night_id", nightIds)
        .eq("status", "waitlisted")
        .order("created_at", { ascending: true })
    : { data: [] };

  const list = (rows ?? []) as unknown as WaitlistRow[];
  const byNight = new Map<string, WaitlistRow[]>();
  for (const r of list) {
    if (!byNight.has(r.event_night_id)) byNight.set(r.event_night_id, []);
    byNight.get(r.event_night_id)!.push(r);
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Waitlist",
        ]}
      />
      <PageHeader
        eyebrow="Waitlist"
        title={event.name}
        sub={`${list.length} waiting · oldest gets promoted automatically when a seat opens up`}
      />
      <EventSubNav active="guests" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {list.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-h1">No one on the waitlist</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              If a night fills up, set pending RSVPs to waitlist from the queue.
              They&apos;ll get auto-promoted (with SMS) when a confirmed guest
              cancels.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-8)",
            }}
          >
            {nights.map((n) => {
              const items = byNight.get(n.id) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={n.id}>
                  <div
                    className="t-meta"
                    style={{ marginBottom: "var(--s-3)" }}
                  >
                    {fmtDate(n.night_date)} · {items.length} waiting
                  </div>
                  <div className="card">
                    {items.map((r, idx) => (
                      <div
                        key={r.id}
                        className="row"
                        style={{ gridTemplateColumns: "1fr 200px 120px" }}
                      >
                        <span className="t-h1 truncate">
                          <span
                            className="t-num"
                            style={{
                              color: "var(--fg-4)",
                              fontFamily: "var(--mono)",
                              fontSize: "var(--ts-sm)",
                              marginRight: "var(--s-2)",
                            }}
                          >
                            #{idx + 1}
                          </span>
                          {r.full_name}
                          {r.plus_ones > 0 && (
                            <span
                              style={{
                                color: "var(--fg-3)",
                                fontWeight: 400,
                              }}
                            >
                              {" "}
                              +{r.plus_ones}
                            </span>
                          )}
                        </span>
                        <span className="t-meta truncate">
                          {r.tier}
                          {r.allocation?.holder_name &&
                            ` · ${r.allocation.holder_name}`}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <PromoteButton
                            eventId={event.id}
                            guestId={r.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
