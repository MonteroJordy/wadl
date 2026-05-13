import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
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
          <div className="w-type-meta">WAITLIST</div>
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
            {list.length} waiting · oldest gets promoted automatically when a
            seat opens up
          </p>
        </div>

        {list.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No one on the waitlist</div>
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
              If a night fills up, set pending RSVPs to waitlist from the
              queue. They&apos;ll get auto-promoted (with SMS) when a confirmed
              guest cancels.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {nights.map((n) => {
              const items = byNight.get(n.id) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={n.id}>
                  <div
                    className="w-type-meta"
                    style={{ marginBottom: 8 }}
                  >
                    {fmtDate(n.night_date).toUpperCase()} · {items.length}{" "}
                    WAITING
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {items.map((r, idx) => (
                      <div
                        key={r.id}
                        className="w-card"
                        style={{
                          padding: 14,
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              color: "var(--w-fg)",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--w-fg-muted)",
                                fontFamily: "var(--w-mono)",
                                fontSize: 12,
                                marginRight: 6,
                              }}
                            >
                              #{idx + 1}
                            </span>
                            {r.full_name}
                            {r.plus_ones > 0 && (
                              <span
                                style={{
                                  color: "var(--w-fg-muted)",
                                  fontWeight: 400,
                                }}
                              >
                                {" "}
                                +{r.plus_ones}
                              </span>
                            )}
                          </p>
                          <div
                            className="w-type-meta"
                            style={{
                              marginTop: 4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.tier.toUpperCase()}
                            {r.allocation?.holder_name &&
                              ` · ${r.allocation.holder_name}`}
                          </div>
                        </div>
                        <PromoteButton eventId={event.id} guestId={r.id} />
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
