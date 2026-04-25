import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
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
      "id, name, account_id, event_nights(id, night_date, doors_at), venue:venues(name, city)"
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{ id: string; night_date: string; doors_at: string }>;
      venue: { name: string | null; city: string | null } | null;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );
  const activeNight = nights.find((n) => n.id === searchParams.night) ?? null;
  const targetNightIds = activeNight ? [activeNight.id] : nights.map((n) => n.id);

  const admin = createAdminClient();
  let guests: PrintGuest[] = [];
  if (targetNightIds.length > 0) {
    const { data } = await admin
      .from("guests")
      .select(
        "id, full_name, plus_ones, tier, status, flag_dna, " +
          "allocation:allocations(holder_name), " +
          "night:event_nights!inner(id, night_date, doors_at), " +
          "check_ins(state)"
      )
      .in("event_night_id", targetNightIds)
      .eq("status", "approved")
      .order("full_name");
    guests = (data ?? []) as unknown as PrintGuest[];
  }

  // Group by allocation.
  const groups = new Map<string, PrintGuest[]>();
  for (const g of guests) {
    const key = g.allocation?.holder_name ?? "Walk-up / direct";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(g);
  }
  const groupOrder = [...groups.keys()].sort();

  const total = guests.reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);

  return (
    <main id="main-content" className="mobile-frame print:mobile-frame-none print:max-w-none print:p-0">
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
          .print-roster .group-rule { border-top: 1px solid #000 !important; }
          @page { margin: 0.5in; }
        }
      `}</style>

      <header className="flex items-center justify-between pt-6 pb-4 print:hidden">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">Print roster</p>
      </header>

      <div className="mb-4 print:hidden">
        <PrintButton />
      </div>

      <div className="print-roster">
        <div className="mb-5">
          <h1 className="display-lg leading-[0.95] mb-1">{event.name}</h1>
          <p className="label-mono">
            {activeNight
              ? `${fmtDate(activeNight.night_date)} · Doors ${fmtTime(activeNight.doors_at)}`
              : `${nights.length} nights`}
            {event.venue?.name && ` · ${event.venue.name}`}
            {event.venue?.city && `, ${event.venue.city}`}
          </p>
          <p className="label-mono mt-1">
            {guests.length} approved · {total} heads incl. +1s
          </p>
        </div>

        {nights.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto print:hidden">
            <Link
              href={`/owner/events/${event.id}/print`}
              className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                !activeNight
                  ? "border-coral bg-s2 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              All nights
            </Link>
            {nights.map((n) => (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}/print?night=${n.id}`}
                className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                  activeNight?.id === n.id
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {fmtDate(n.night_date)}
              </Link>
            ))}
          </div>
        )}

        {guests.length === 0 ? (
          <p className="label-mono">
            No approved guests on this scope. Approve some from the queue first.
          </p>
        ) : (
          groupOrder.map((name) => {
            const list = groups.get(name) ?? [];
            const subtotal = list.reduce(
              (s, g) => s + 1 + (g.plus_ones ?? 0),
              0
            );
            return (
              <section key={name} className="mb-5">
                <div className="flex items-baseline justify-between mb-2 group-rule pt-2">
                  <p className="font-sans font-semibold text-cream print:text-black">
                    {name}
                  </p>
                  <p className="label-mono">{list.length} · {subtotal} heads</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="label-mono text-left">
                      <th className="w-6"></th>
                      <th>Name</th>
                      <th className="w-16">Tier</th>
                      <th className="w-8 text-right">+1</th>
                      {!activeNight && <th className="w-20">Night</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((g) => {
                      const scanned = g.check_ins.some(
                        (c) => c.state === "approved"
                      );
                      return (
                        <tr
                          key={g.id}
                          className={`border-t border-line ${
                            g.flag_dna ? "text-coral" : ""
                          }`}
                        >
                          <td className="py-1">
                            <span
                              className={`checkbox inline-block rounded-sm ${
                                scanned
                                  ? "bg-mint/40 border border-mint"
                                  : "border border-line"
                              }`}
                            />
                          </td>
                          <td className="py-1">
                            {g.full_name}
                            {g.flag_dna && (
                              <span className="ml-2 label-mono">⚠ DNA</span>
                            )}
                          </td>
                          <td className="py-1 label-mono">
                            {g.tier.toUpperCase()}
                          </td>
                          <td className="py-1 label-mono text-right">
                            {g.plus_ones > 0 ? `+${g.plus_ones}` : ""}
                          </td>
                          {!activeNight && (
                            <td className="py-1 label-mono">
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
    </main>
  );
}
