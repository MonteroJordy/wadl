import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holder dashboard — WADL" };

interface OwnerRow {
  allocation_id: string;
  allocation: {
    id: string;
    holder_name: string;
    cap: number;
    plus_ones_allowed: boolean;
    list_open: boolean;
    event_night_id: string;
    event_night: {
      id: string;
      night_date: string;
      doors_at: string;
      is_frozen: boolean;
      event: { id: string; name: string };
    };
    tokens?: Array<{ token: string; revoked_at: string | null }>;
  };
}

interface GuestAggRow {
  allocation_id: string;
  plus_ones: number;
  status: string;
  check_ins: Array<{ state: string }>;
}

export default async function HolderDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?return=/holder");

  const admin = createAdminClient();
  const { data: ownerRowsRaw } = await admin
    .from("allocation_owners")
    .select(
      "allocation_id, allocation:allocations!inner(id, holder_name, cap, plus_ones_allowed, list_open, event_night_id, event_night:event_nights!inner(id, night_date, doors_at, is_frozen, event:events!inner(id, name)))"
    )
    .eq("user_id", user.id);
  const owned = (ownerRowsRaw ?? []) as unknown as OwnerRow[];

  // Latest token per allocation for quick-share.
  const allocIds = owned.map((o) => o.allocation_id);
  const tokenMap = new Map<string, string>();
  if (allocIds.length > 0) {
    const { data: toks } = await admin
      .from("allocation_tokens")
      .select("token, allocation_id, revoked_at, created_at")
      .in("allocation_id", allocIds)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    for (const t of (toks ?? []) as Array<{
      token: string;
      allocation_id: string;
    }>) {
      if (!tokenMap.has(t.allocation_id)) tokenMap.set(t.allocation_id, t.token);
    }
  }

  // Guest aggregates per allocation for show-rate + capacity.
  let agg: GuestAggRow[] = [];
  if (allocIds.length > 0) {
    const { data: rows } = await admin
      .from("guests")
      .select("allocation_id, plus_ones, status, check_ins(state)")
      .in("allocation_id", allocIds);
    agg = (rows ?? []) as unknown as GuestAggRow[];
  }

  function statsFor(allocId: string) {
    let approved = 0;
    let scanned = 0;
    let used = 0;
    for (const g of agg) {
      if (g.allocation_id !== allocId) continue;
      if (g.status === "approved") {
        const heads = 1 + (g.plus_ones ?? 0);
        approved += heads;
        if (g.check_ins.some((c) => c.state === "approved")) scanned += heads;
      }
      if (g.status === "approved" || g.status === "pending") {
        used += 1 + (g.plus_ones ?? 0);
      }
    }
    return { approved, scanned, used };
  }

  // Lifetime show rate across all owned allocations.
  const totals = owned.reduce(
    (acc, o) => {
      const s = statsFor(o.allocation_id);
      acc.approved += s.approved;
      acc.scanned += s.scanned;
      acc.events.add(o.allocation.event_night.event.id);
      return acc;
    },
    { approved: 0, scanned: 0, events: new Set<string>() }
  );
  const showRate = totals.approved === 0 ? 0 : totals.scanned / totals.approved;

  // Sort upcoming first, then by date desc.
  const now = Date.now();
  owned.sort((a, b) => {
    const ad = new Date(a.allocation.event_night.doors_at).getTime();
    const bd = new Date(b.allocation.event_night.doors_at).getTime();
    const aFuture = ad >= now;
    const bFuture = bd >= now;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return aFuture ? ad - bd : bd - ad;
  });

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-10">
      <header className="mb-6">
        <p className="label-mono mb-1">Holder dashboard</p>
        <h1 className="display-lg">Your allocations</h1>
      </header>

      <section className="card mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="label-mono">Show rate</p>
            <p className="font-display text-3xl text-cream leading-none">
              {Math.round(showRate * 100)}%
            </p>
          </div>
          <div>
            <p className="label-mono">Lifetime</p>
            <p className="font-display text-3xl text-mint leading-none">
              {totals.scanned}
            </p>
            <p className="label-mono mt-1">scanned</p>
          </div>
          <div>
            <p className="label-mono">Events</p>
            <p className="font-display text-3xl text-cream leading-none">
              {totals.events.size}
            </p>
          </div>
        </div>
      </section>

      {owned.length === 0 ? (
        <EmptyState
          title="No allocations claimed"
          body="When a host shares a magic link, open it and tap 'Claim this allocation' to track it here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {owned.map((o) => {
            const s = statsFor(o.allocation_id);
            const remaining = Math.max(0, o.allocation.cap - s.used);
            const token = tokenMap.get(o.allocation_id);
            const eventDate = new Date(o.allocation.event_night.doors_at);
            const isPast = eventDate.getTime() < now;
            return (
              <li
                key={o.allocation_id}
                className="card hover:border-coral/60 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-sans text-cream font-semibold truncate">
                      {o.allocation.event_night.event.name}
                    </p>
                    <p className="label-mono mt-1">
                      {fmtDate(o.allocation.event_night.night_date)} · Doors{" "}
                      {fmtTime(o.allocation.event_night.doors_at)}
                      {isPast ? " · past" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl text-cream leading-none">
                      {s.used}
                      <span className="text-muted">/{o.allocation.cap}</span>
                    </p>
                    <p className="label-mono mt-1">on list</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 label-mono">
                  <div>
                    <span className="text-cream">{remaining}</span> left
                  </div>
                  <div>
                    <span className="text-mint">{s.scanned}</span> scanned
                  </div>
                  <div>
                    {o.allocation.list_open && !o.allocation.event_night.is_frozen ? (
                      <span className="text-mint">open</span>
                    ) : (
                      <span className="text-coral">closed</span>
                    )}
                  </div>
                </div>
                {token && !isPast && (
                  <Link
                    href={`/h/${token}`}
                    target="_blank"
                    className="btn-ghost text-center mt-3 block text-xs"
                  >
                    Open list →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="label-mono mt-8 text-center">
        <a href="/api/auth/signout" className="hover:text-cream">
          Sign out
        </a>
      </p>
    </main>
  );
}
