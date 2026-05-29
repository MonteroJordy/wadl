import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate, fmtTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";

interface PrintGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  allocation: { holder_name: string } | null;
  night: { id: string; night_date: string; doors_at: string };
  check_ins: Array<{ state: string }>;
}

export default async function PrintRosterPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, night_date, doors_at), venue:venues(name, city)",
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
      }>;
      venue: { name: string | null; city: string | null } | null;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1,
  );
  const activeNight = nights.find((n) => n.id === searchParams.night) ?? null;
  const targetNightIds = activeNight
    ? [activeNight.id]
    : nights.map((n) => n.id);

  const admin = createAdminClient();
  let guests: PrintGuest[] = [];
  if (targetNightIds.length > 0) {
    const { data } = await admin
      .from("guests")
      .select(
        "id, full_name, plus_ones, tier, status, flag_dna, " +
          "allocation:allocations(holder_name), " +
          "night:event_nights!inner(id, night_date, doors_at), " +
          "check_ins(state)",
      )
      .in("event_night_id", targetNightIds)
      .eq("status", "approved")
      .order("full_name");
    guests = (data ?? []) as unknown as PrintGuest[];
  }

  const groups = new Map<string, PrintGuest[]>();
  for (const g of guests) {
    const key = g.allocation?.holder_name ?? "Walk-up / direct";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }
  const groupOrder = [...groups.keys()].sort();

  const total = guests.reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <style>{`
        @media print {
          html, body { background: #fff !important; color: #000 !important; }
          .print-roster, .print-roster * {
            background: #fff !important;
            color: #000 !important;
            border-color: #000 !important;
          }
          .print-roster .checkbox {
            border: 1px solid #000 !important;
            width: 16px; height: 16px;
          }
          .print-hide { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}</style>

      <div className="print-hide">
        <Breadcrumb
          items={[
            ["Events", "/owner"],
            [event.name, `/owner/events/${event.id}`],
            "Print roster",
          ]}
        />
        <PageHeader
          eyebrow="Print roster"
          title="Door roster"
          sub="Grouped by holder · check-box per head."
          actions={<PrintButton />}
        />
        <EventSubNav active="guests" eventId={event.id} />
      </div>

      <div style={{ padding: "var(--s-8)", maxWidth: 760 }}>
        {nights.length > 1 && (
          <div
            className="print-hide"
            style={{
              display: "flex",
              gap: "var(--s-1)",
              overflowX: "auto",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-1)",
            }}
          >
            <Link
              href={`/owner/events/${event.id}/print`}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <span
                className={`chip ${!activeNight ? "chip--solid" : "chip--ghost"}`}
              >
                All nights
              </span>
            </Link>
            {nights.map((n) => (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}/print?night=${n.id}`}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <span
                  className={`chip ${
                    activeNight?.id === n.id ? "chip--solid" : "chip--ghost"
                  }`}
                >
                  {fmtDate(n.night_date)}
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="print-roster">
          <div
            style={{
              borderBottom: "1px solid var(--line)",
              paddingBottom: "var(--s-5)",
              marginBottom: "var(--s-5)",
            }}
          >
            <div className="t-display-md">{event.name}</div>
            <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              {activeNight
                ? `${fmtDate(activeNight.night_date)} · doors ${fmtTime(activeNight.doors_at)}`
                : `${nights.length} nights`}
              {event.venue?.name && ` · ${event.venue.name}`}
              {event.venue?.city && `, ${event.venue.city}`}
            </div>
            <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
              {guests.length} approved · {total} heads incl. +1s
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="t-body-2">
              No approved guests on this scope. Approve some from the queue
              first.
            </div>
          ) : (
            groupOrder.map((name) => {
              const list = groups.get(name) ?? [];
              const subtotal = list.reduce(
                (s, g) => s + 1 + (g.plus_ones ?? 0),
                0,
              );
              return (
                <section key={name} style={{ marginBottom: "var(--s-6)" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: "var(--s-2)",
                      borderTop: "1px solid var(--line)",
                      paddingTop: "var(--s-3)",
                    }}
                  >
                    <span className="t-h1">{name}</span>
                    <span className="t-meta">
                      {list.length} · {subtotal} heads
                    </span>
                  </div>
                  <table
                    style={{
                      width: "100%",
                      fontSize: "var(--ts-md)",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: 24, textAlign: "left" }}></th>
                        <th
                          className="t-meta"
                          style={{
                            textAlign: "left",
                            paddingBottom: "var(--s-2)",
                          }}
                        >
                          Name
                        </th>
                        <th
                          className="t-meta"
                          style={{
                            width: 64,
                            textAlign: "left",
                            paddingBottom: "var(--s-2)",
                          }}
                        >
                          Tier
                        </th>
                        <th
                          className="t-meta"
                          style={{
                            width: 32,
                            textAlign: "right",
                            paddingBottom: "var(--s-2)",
                          }}
                        >
                          +1
                        </th>
                        {!activeNight && (
                          <th
                            className="t-meta"
                            style={{
                              width: 80,
                              textAlign: "left",
                              paddingBottom: "var(--s-2)",
                            }}
                          >
                            Night
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((g) => {
                        const scanned = g.check_ins.some(
                          (c) => c.state === "approved",
                        );
                        return (
                          <tr
                            key={g.id}
                            style={{
                              borderTop: "1px solid var(--line)",
                              color: g.flag_dna ? "var(--err)" : undefined,
                            }}
                          >
                            <td style={{ padding: "6px 0" }}>
                              <span
                                className="checkbox"
                                style={{
                                  display: "inline-block",
                                  width: 14,
                                  height: 14,
                                  background: scanned
                                    ? "var(--ok)"
                                    : "transparent",
                                  border: scanned
                                    ? "1px solid var(--ok)"
                                    : "1px solid var(--line-2)",
                                }}
                              />
                            </td>
                            <td style={{ padding: "6px 0" }}>
                              {g.full_name}
                              {g.flag_dna && (
                                <span
                                  className="t-meta"
                                  style={{ marginLeft: "var(--s-2)" }}
                                >
                                  ⚠ DNA
                                </span>
                              )}
                            </td>
                            <td
                              className="t-meta"
                              style={{ padding: "6px 0" }}
                            >
                              {g.tier}
                            </td>
                            <td
                              className="t-meta"
                              style={{
                                padding: "6px 0",
                                textAlign: "right",
                              }}
                            >
                              {g.plus_ones > 0 ? `+${g.plus_ones}` : ""}
                            </td>
                            {!activeNight && (
                              <td
                                className="t-meta"
                                style={{ padding: "6px 0" }}
                              >
                                {fmtDate(g.night.night_date)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
