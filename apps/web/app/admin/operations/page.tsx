import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface LiveNight {
  id: string;
  doors_at: string;
  capacity_cap: number | null;
  event: { id: string; name: string; account: { display_name: string; venues: { city: string | null }[] | null } | null };
}

export default async function AdminOperationsPage() {
  const admin = createAdminClient();
  const now = Date.now();
  const lo = new Date(now - 6 * 60 * 60_000).toISOString();
  const hi = new Date(now + 12 * 60 * 60_000).toISOString();

  const [live, scansLast24h, broadcasts7d, ticketsOpen] = await Promise.all([
    admin
      .from("event_nights")
      .select(
        "id, doors_at, capacity_cap, event:events!inner(id, name, account:accounts!inner(display_name, venues(city)))"
      )
      .gte("doors_at", lo)
      .lte("doors_at", hi),
    admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("state", "approved")
      .gte("scanned_at", new Date(now - 24 * 60 * 60_000).toISOString()),
    admin
      .from("broadcasts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - 7 * 24 * 60 * 60_000).toISOString()),
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "pending"]),
  ]);

  const liveRows = (live.data ?? []) as unknown as LiveNight[];

  // Per-night counts.
  const nightIds = liveRows.map((r) => r.id);
  const liveStats = new Map<string, { in: number; pending: number; rsvp: number }>();
  if (nightIds.length > 0) {
    const [scansRes, guestsRes] = await Promise.all([
      admin
        .from("check_ins")
        .select("event_night_id, state")
        .in("event_night_id", nightIds),
      admin
        .from("guests")
        .select("event_night_id, status, plus_ones")
        .in("event_night_id", nightIds),
    ]);
    for (const id of nightIds) liveStats.set(id, { in: 0, pending: 0, rsvp: 0 });
    for (const s of (scansRes.data ?? []) as Array<{
      event_night_id: string;
      state: string;
    }>) {
      if (s.state === "approved") liveStats.get(s.event_night_id)!.in += 1;
    }
    for (const g of (guestsRes.data ?? []) as Array<{
      event_night_id: string;
      status: string;
      plus_ones: number;
    }>) {
      const heads = 1 + (g.plus_ones ?? 0);
      const slot = liveStats.get(g.event_night_id)!;
      if (g.status === "approved") slot.rsvp += heads;
      else if (g.status === "pending") slot.pending += heads;
    }
  }

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Operations</h1>
      <p className="label-mono mb-6">Platform-wide health + live state.</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card border-mint/40">
          <p className="label-mono">System health</p>
          <p className="font-display text-2xl text-mint leading-none mt-1">OK</p>
        </div>
        <div className="card">
          <p className="label-mono">Live events</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {liveRows.length}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Check-ins / 24h</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {scansLast24h.count ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Broadcasts / 7d</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {broadcasts7d.count ?? 0}
          </p>
        </div>
      </section>

      <section className="card mb-4 border-coral/30">
        <p className="label-mono mb-1">Open support</p>
        <p className="font-display text-3xl text-coral leading-none">
          {ticketsOpen.count ?? 0}
        </p>
        <Link
          href="/admin/support"
          className="label-mono hover:text-cream block mt-2"
        >
          Open queue →
        </Link>
      </section>

      <section>
        <p className="label-mono mb-2">Tonight live across the platform</p>
        {liveRows.length === 0 ? (
          <p className="text-muted text-sm">Nothing live right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="label-mono text-left">
                <tr>
                  <th className="pb-2">Event</th>
                  <th>Account</th>
                  <th>City</th>
                  <th className="text-right">RSVPs</th>
                  <th className="text-right">In</th>
                  <th className="text-right">Pending</th>
                  <th className="text-right">Cap</th>
                </tr>
              </thead>
              <tbody>
                {liveRows.map((r) => {
                  const s = liveStats.get(r.id) ?? { in: 0, pending: 0, rsvp: 0 };
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-2 text-cream truncate">{r.event.name}</td>
                      <td className="py-2 text-muted">
                        {r.event.account?.display_name ?? "—"}
                      </td>
                      <td className="py-2 label-mono">
                        {r.event.account?.venues?.[0]?.city ?? "—"}
                      </td>
                      <td className="py-2 text-right">{s.rsvp}</td>
                      <td className="py-2 text-right text-mint">{s.in}</td>
                      <td className="py-2 text-right text-gold">{s.pending}</td>
                      <td className="py-2 text-right">
                        {r.capacity_cap ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
