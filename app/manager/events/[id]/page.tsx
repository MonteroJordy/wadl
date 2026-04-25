import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireDoorContext,
  resolveActiveNight,
} from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";
import GuestRow from "./guest-row";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface GuestRowData {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  allocation: { holder_name: string } | null;
  check_ins: Array<{ scanned_at: string; state: string }>;
}

const STATUS_FILTERS = ["all", "pending", "approved", "in", "rejected"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const TIER_FILTERS = ["all", "ga", "vip", "all_access"] as const;
type TierFilter = (typeof TIER_FILTERS)[number];

export default async function ManagerEventPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string; status?: string; tier?: string };
}) {
  const { admin, resolved } = await requireDoorContext({
    eventId: params.id,
    requireRole: "door_manager",
  });
  if (!resolved) notFound();

  const { nights, active } = await resolveActiveNight(
    admin,
    params.id,
    searchParams.night
  );

  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    (searchParams.status ?? "all") as StatusFilter
  )
    ? (searchParams.status as StatusFilter)
    : "all";
  const tierFilter: TierFilter = TIER_FILTERS.includes(
    (searchParams.tier ?? "all") as TierFilter
  )
    ? (searchParams.tier as TierFilter)
    : "all";

  let rows: GuestRowData[] = [];
  let inCount = 0;
  if (active) {
    const [guestsRes, checkInsRes] = await Promise.all([
      admin
        .from("guests")
        .select(
          "id, full_name, plus_ones, tier, status, flag_dna, allocation:allocations(holder_name), check_ins(scanned_at, state)"
        )
        .eq("event_night_id", active.id)
        .order("created_at", { ascending: false }),
      admin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_night_id", active.id)
        .eq("state", "approved"),
    ]);
    rows = (guestsRes.data ?? []) as unknown as GuestRowData[];
    inCount = checkInsRes.count ?? 0;
  }

  // Apply filters.
  const filtered = rows.filter((g) => {
    if (tierFilter !== "all" && g.tier !== tierFilter) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "in") {
      return g.check_ins.some((c) => c.state === "approved");
    }
    return g.status === statusFilter;
  });

  const capacity = active?.capacity_cap ?? 0;

  function filterLink(key: "status" | "tier", value: string) {
    const sp = new URLSearchParams();
    if (searchParams.night) sp.set("night", searchParams.night);
    sp.set("status", key === "status" ? value : statusFilter);
    sp.set("tier", key === "tier" ? value : tierFilter);
    return `/manager/events/${params.id}?${sp.toString()}`;
  }

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-start justify-between pt-6 pb-4">
        <div>
          <p className="label-mono text-gold mb-1">Manager</p>
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
                    href={`/manager/events/${params.id}?night=${n.id}`}
                    className={`shrink-0 px-3 py-2 rounded-md border text-xs font-mono uppercase tracking-wider ${
                      isActive
                        ? "border-gold bg-s2 text-cream"
                        : "border-line bg-s1 text-muted hover:text-cream"
                    }`}
                  >
                    {fmtDate(n.night_date)}
                  </Link>
                );
              })}
            </div>
          )}

          <section className="card border-gold/40 mb-4">
            <p className="label-mono text-gold mb-1">In</p>
            <p className="font-display text-5xl leading-none text-gold">
              {inCount}
              <span className="text-muted text-3xl">/{capacity || "—"}</span>
            </p>
          </section>

          <section className="grid grid-cols-3 gap-2 mb-4">
            <Link
              href={`/door/events/${params.id}/scan?night=${active.id}`}
              className="card text-center border-mint/40 hover:border-mint transition"
            >
              <p className="font-display text-2xl text-mint">SCAN</p>
            </Link>
            <Link
              href={`/door/events/${params.id}/search?night=${active.id}`}
              className="card text-center hover:border-cream transition"
            >
              <p className="font-display text-2xl text-cream">SEARCH</p>
            </Link>
            <Link
              href={`/manager/events/${params.id}/add?night=${active.id}`}
              className="card text-center border-gold/40 hover:border-gold transition"
            >
              <p className="font-display text-2xl text-gold">+ ADD</p>
            </Link>
          </section>

          <section className="mb-3">
            <p className="label-mono mb-2">Status</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((s) => {
                const isActive = s === statusFilter;
                return (
                  <Link
                    key={s}
                    href={filterLink("status", s)}
                    className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                      isActive
                        ? "border-gold bg-s2 text-cream"
                        : "border-line bg-s1 text-muted hover:text-cream"
                    }`}
                  >
                    {s === "in" ? "Checked in" : s}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mb-4">
            <p className="label-mono mb-2">Tier</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {TIER_FILTERS.map((t) => {
                const isActive = t === tierFilter;
                return (
                  <Link
                    key={t}
                    href={filterLink("tier", t)}
                    className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                      isActive
                        ? "border-gold bg-s2 text-cream"
                        : "border-line bg-s1 text-muted hover:text-cream"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </Link>
                );
              })}
            </div>
          </section>

          <p className="label-mono mb-2">
            {filtered.length} / {rows.length} showing
          </p>

          <div className="flex flex-col gap-2">
            {filtered.map((g) => {
              const approvedScan = g.check_ins.find((c) => c.state === "approved");
              return (
                <GuestRow
                  key={g.id}
                  eventId={params.id}
                  guest={{
                    id: g.id,
                    full_name: g.full_name,
                    plus_ones: g.plus_ones,
                    tier: g.tier,
                    status: g.status,
                    flag_dna: g.flag_dna,
                    allocation_name: g.allocation?.holder_name ?? null,
                    checked_in_at: approvedScan?.scanned_at ?? null,
                  }}
                />
              );
            })}
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="Nothing matches"
              body={
                rows.length === 0
                  ? "No guests yet — wait for RSVPs or add a walk-up."
                  : "Clear your filters to see everyone."
              }
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No nights yet"
          body="The event has no nights defined. Ask the owner to add one."
        />
      )}

      <p className="label-mono mt-auto pt-8 text-center text-gold">
        Manager — approve, check in, and add walk-ups
      </p>
    </main>
  );
}
