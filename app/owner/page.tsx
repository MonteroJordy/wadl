import Link from "next/link";
import { requireOwnerContext, fmtDate, fmtTime } from "@/lib/owner";

export const dynamic = "force-dynamic";

interface NightWithEvent {
  id: string;
  event_id: string;
  night_date: string;
  doors_at: string;
  capacity_cap: number | null;
  is_frozen: boolean;
  event: { id: string; name: string; flyer_url: string | null } | null;
}

interface GuestRow {
  event_night_id: string;
  status: string;
}

interface CheckInRow {
  event_night_id: string;
  state: string;
}

export default async function OwnerWeekViewPage() {
  const { supabase, account, profile } = await requireOwnerContext();

  // Window: today → +7 days.
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, name, flyer_url, event_nights(id, event_id, night_date, doors_at, capacity_cap, is_frozen)")
    .eq("account_id", account.id);

  const nights: NightWithEvent[] = [];
  for (const e of eventsData ?? []) {
    const ev = e as {
      id: string;
      name: string;
      flyer_url: string | null;
      event_nights: Array<{
        id: string;
        event_id: string;
        night_date: string;
        doors_at: string;
        capacity_cap: number | null;
        is_frozen: boolean;
      }>;
    };
    for (const n of ev.event_nights ?? []) {
      const d = new Date(n.doors_at);
      if (d >= start && d <= end) {
        nights.push({
          ...n,
          event: { id: ev.id, name: ev.name, flyer_url: ev.flyer_url },
        });
      }
    }
  }

  nights.sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  let guests: GuestRow[] = [];
  let checkIns: CheckInRow[] = [];
  if (nights.length > 0) {
    const nightIds = nights.map((n) => n.id);
    const [guestsRes, checkInsRes] = await Promise.all([
      supabase.from("guests").select("event_night_id, status").in("event_night_id", nightIds),
      supabase.from("check_ins").select("event_night_id, state").in("event_night_id", nightIds),
    ]);
    guests = (guestsRes.data ?? []) as GuestRow[];
    checkIns = (checkInsRes.data ?? []) as CheckInRow[];
  }

  function statsFor(nightId: string) {
    let approved = 0,
      pending = 0,
      scanned = 0;
    for (const g of guests) {
      if (g.event_night_id !== nightId) continue;
      if (g.status === "approved") approved++;
      else if (g.status === "pending") pending++;
    }
    for (const c of checkIns) {
      if (c.event_night_id !== nightId) continue;
      if (c.state === "approved") scanned++;
    }
    return { approved, pending, scanned };
  }

  // Group by night_date.
  const byDate = new Map<string, NightWithEvent[]>();
  for (const n of nights) {
    const key = n.night_date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(n);
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-start justify-between pt-6 pb-4">
        <div>
          <p className="label-mono mb-1">This week</p>
          <h1 className="display-lg">{account.display_name}</h1>
        </div>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="label-mono hover:text-cream transition">
            Sign out
          </button>
        </form>
      </header>

      <Link href="/owner/events/new" className="btn-primary text-center mb-6 block">
        + Create event
      </Link>

      {byDate.size === 0 ? (
        <div className="card text-center mt-6">
          <p className="label-mono mb-2">No nights this week</p>
          <p className="text-muted text-sm">
            Create an event to get your first guest list on the door.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {[...byDate.entries()].map(([date, ns]) => (
            <section key={date}>
              <p className="label-mono mb-2">{fmtDate(date)}</p>
              <div className="flex flex-col gap-2">
                {ns.map((n) => {
                  const s = statsFor(n.id);
                  const cap = n.capacity_cap ?? 0;
                  return (
                    <Link
                      key={n.id}
                      href={`/owner/events/${n.event_id}?night=${n.id}`}
                      className="card hover:border-coral/60 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-sans text-cream font-semibold">
                            {n.event?.name}
                          </p>
                          <p className="label-mono mt-1">
                            Doors {fmtTime(n.doors_at)}
                            {n.is_frozen ? " · FROZEN" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-3xl leading-none text-cream">
                            {s.scanned}
                            <span className="text-muted">/{cap || "—"}</span>
                          </p>
                          <p className="label-mono mt-1">Scanned</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-4 label-mono">
                        <span>{s.approved} approved</span>
                        {s.pending > 0 && (
                          <span className="text-gold">{s.pending} pending</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="label-mono mt-auto pt-8 text-center">
        {profile.full_name?.split(" ")[0]} · {account.account_type}
      </p>
    </main>
  );
}
