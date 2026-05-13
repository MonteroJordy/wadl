import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate, fmtTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
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

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          className="print-hide"
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
          <div className="w-type-meta">PRINT ROSTER</div>
        </div>

        <div className="print-hide" style={{ marginBottom: 16 }}>
          <PrintButton />
        </div>

        <div className="print-roster">
          <div
            style={{
              borderBottom: "1px solid var(--w-line)",
              paddingBottom: 20,
              marginBottom: 20,
            }}
          >
            <div className="w-type-display-md">{event.name}</div>
            <p
              className="w-type-meta"
              style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
            >
              {activeNight
                ? `${fmtDate(activeNight.night_date).toUpperCase()} · DOORS ${fmtTime(activeNight.doors_at).toUpperCase()}`
                : `${nights.length} NIGHTS`}
              {event.venue?.name && ` · ${event.venue.name.toUpperCase()}`}
              {event.venue?.city && `, ${event.venue.city.toUpperCase()}`}
            </p>
            <p
              className="w-type-meta"
              style={{ marginTop: 6, color: "var(--w-fg-muted)" }}
            >
              {guests.length} APPROVED · {total} HEADS INCL. +1S
            </p>
          </div>

          {nights.length > 1 && (
            <div
              className="print-hide"
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                marginBottom: 16,
                paddingBottom: 4,
              }}
            >
              <Link
                href={`/owner/events/${event.id}/print`}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <Chip tone={!activeNight ? "acc" : "ghost"}>ALL NIGHTS</Chip>
              </Link>
              {nights.map((n) => (
                <Link
                  key={n.id}
                  href={`/owner/events/${event.id}/print?night=${n.id}`}
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <Chip tone={activeNight?.id === n.id ? "acc" : "ghost"}>
                    {fmtDate(n.night_date).toUpperCase()}
                  </Chip>
                </Link>
              ))}
            </div>
          )}

          {guests.length === 0 ? (
            <p
              className="w-type-meta"
              style={{ color: "var(--w-fg-muted)" }}
            >
              NO APPROVED GUESTS ON THIS SCOPE. APPROVE SOME FROM THE QUEUE
              FIRST.
            </p>
          ) : (
            groupOrder.map((name) => {
              const list = groups.get(name) ?? [];
              const subtotal = list.reduce(
                (s, g) => s + 1 + (g.plus_ones ?? 0),
                0,
              );
              return (
                <section key={name} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      borderTop: "1px solid var(--w-line)",
                      paddingTop: 10,
                    }}
                  >
                    <p
                      style={{ color: "var(--w-fg)", fontWeight: 600 }}
                    >
                      {name}
                    </p>
                    <div className="w-type-meta">
                      {list.length} · {subtotal} HEADS
                    </div>
                  </div>
                  <table
                    style={{
                      width: "100%",
                      fontSize: 14,
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: 24, textAlign: "left" }}></th>
                        <th
                          className="w-type-meta"
                          style={{ textAlign: "left", paddingBottom: 8 }}
                        >
                          NAME
                        </th>
                        <th
                          className="w-type-meta"
                          style={{
                            width: 64,
                            textAlign: "left",
                            paddingBottom: 8,
                          }}
                        >
                          TIER
                        </th>
                        <th
                          className="w-type-meta"
                          style={{
                            width: 32,
                            textAlign: "right",
                            paddingBottom: 8,
                          }}
                        >
                          +1
                        </th>
                        {!activeNight && (
                          <th
                            className="w-type-meta"
                            style={{
                              width: 80,
                              textAlign: "left",
                              paddingBottom: 8,
                            }}
                          >
                            NIGHT
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
                              borderTop: "1px solid var(--w-line)",
                              color: g.flag_dna ? "var(--w-err)" : undefined,
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
                                    ? "var(--w-ok)"
                                    : "transparent",
                                  border: scanned
                                    ? "1px solid var(--w-ok)"
                                    : "1px solid var(--w-line)",
                                }}
                              />
                            </td>
                            <td style={{ padding: "6px 0" }}>
                              {g.full_name}
                              {g.flag_dna && (
                                <span
                                  className="w-type-meta"
                                  style={{ marginLeft: 8 }}
                                >
                                  ⚠ DNA
                                </span>
                              )}
                            </td>
                            <td
                              className="w-type-meta"
                              style={{ padding: "6px 0" }}
                            >
                              {g.tier.toUpperCase()}
                            </td>
                            <td
                              className="w-type-meta"
                              style={{
                                padding: "6px 0",
                                textAlign: "right",
                              }}
                            >
                              {g.plus_ones > 0 ? `+${g.plus_ones}` : ""}
                            </td>
                            {!activeNight && (
                              <td
                                className="w-type-meta"
                                style={{ padding: "6px 0" }}
                              >
                                {fmtDate(g.night.night_date).toUpperCase()}
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
