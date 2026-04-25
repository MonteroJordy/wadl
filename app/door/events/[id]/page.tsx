import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireDoorContext,
  resolveActiveNight,
} from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DoorEventHome({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { admin, resolved } = await requireDoorContext({ eventId: params.id });
  if (!resolved) notFound();

  const { nights, active } = await resolveActiveNight(
    admin,
    params.id,
    searchParams.night
  );

  let inCount = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  if (active) {
    const [checkInsRes, guestsRes] = await Promise.all([
      admin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_night_id", active.id)
        .eq("state", "approved"),
      admin
        .from("guests")
        .select("status, plus_ones")
        .eq("event_night_id", active.id)
        .in("status", ["approved", "pending"]),
    ]);
    inCount = checkInsRes.count ?? 0;
    for (const g of guestsRes.data ?? []) {
      if (g.status === "approved") approvedCount += 1 + (g.plus_ones ?? 0);
      else if (g.status === "pending") pendingCount += 1 + (g.plus_ones ?? 0);
    }
  }

  const capacity = active?.capacity_cap ?? 0;

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-start justify-between pt-6 pb-4">
        <div>
          <p className="label-mono text-mint mb-1">Door / Staff</p>
          <h1 className="display-lg leading-[0.95]">{resolved.event.name}</h1>
        </div>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="label-mono hover:text-cream transition">
            Sign out
          </button>
        </form>
      </header>

      {active ? (
        <>
          <p className="label-mono mb-4">
            {fmtDate(active.night_date)} · Doors {fmtTime(active.doors_at)}
            {active.is_frozen ? " · FROZEN" : ""}
          </p>

          {nights.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {nights.map((n) => {
                const isActive = n.id === active.id;
                return (
                  <Link
                    key={n.id}
                    href={`/door/events/${params.id}?night=${n.id}`}
                    className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                      isActive
                        ? "border-mint bg-s2 text-cream"
                        : "border-line bg-s1 text-muted hover:text-cream"
                    }`}
                  >
                    {fmtDate(n.night_date)}
                  </Link>
                );
              })}
            </div>
          )}

          <section className="card border-mint/40 mb-4">
            <p className="label-mono text-mint mb-1">In</p>
            <p className="font-display text-7xl leading-none text-mint">
              {inCount}
              <span className="text-muted text-4xl">/{capacity || "—"}</span>
            </p>
            <div className="flex gap-4 mt-3">
              <span className="label-mono">
                {approvedCount} approved
              </span>
              {pendingCount > 0 && (
                <span className="label-mono text-gold">{pendingCount} pending</span>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2">
            <Link
              href={`/door/events/${params.id}/scan?night=${active.id}`}
              className="card text-center border-mint/40 hover:border-mint transition"
            >
              <p className="font-display text-3xl text-mint mb-1">SCAN</p>
              <p className="label-mono">Camera QR</p>
            </Link>
            <Link
              href={`/door/events/${params.id}/search?night=${active.id}`}
              className="card text-center hover:border-mint transition"
            >
              <p className="font-display text-3xl text-cream mb-1">SEARCH</p>
              <p className="label-mono">By name</p>
            </Link>
          </section>

          {resolved.role === "door_manager" && (
            <Link
              href={`/manager/events/${params.id}`}
              className="label-mono block mt-6 text-center text-gold hover:brightness-125"
            >
              Manager view →
            </Link>
          )}
        </>
      ) : (
        <div className="card text-center mt-4">
          <p className="label-mono mb-2">No nights yet</p>
        </div>
      )}

      <p className="label-mono mt-auto pt-8 text-center text-mint">
        Staff — scan or search only
      </p>
    </main>
  );
}
