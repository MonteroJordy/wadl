import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Cover, PageHeader } from "@/components/v5";

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
      "allocation_id, allocation:allocations!inner(id, holder_name, cap, plus_ones_allowed, list_open, event_night_id, event_night:event_nights!inner(id, night_date, doors_at, is_frozen, event:events!inner(id, name)))",
    )
    .eq("user_id", user.id);
  const owned = (ownerRowsRaw ?? []) as unknown as OwnerRow[];

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

  const totals = owned.reduce(
    (acc, o) => {
      const s = statsFor(o.allocation_id);
      acc.approved += s.approved;
      acc.scanned += s.scanned;
      acc.events.add(o.allocation.event_night.event.id);
      return acc;
    },
    { approved: 0, scanned: 0, events: new Set<string>() },
  );
  const showRate =
    totals.approved === 0 ? 0 : totals.scanned / totals.approved;

  const now = Date.now();
  owned.sort((a, b) => {
    const ad = new Date(a.allocation.event_night.doors_at).getTime();
    const bd = new Date(b.allocation.event_night.doors_at).getTime();
    const aFuture = ad >= now;
    const bFuture = bd >= now;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return aFuture ? ad - bd : bd - ad;
  });

  const liveCount = owned.filter(
    (o) =>
      o.allocation.list_open && !o.allocation.event_night.is_frozen,
  ).length;
  const subline = `${liveCount} live · ${totals.scanned} of ${totals.approved} scanned · ${Math.round(
    showRate * 100,
  )}% show rate`;

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PageHeader
        eyebrow="Independent promoter"
        title="Your lists"
        sub={owned.length === 0 ? "No allocations claimed yet." : subline}
      />

      {owned.length === 0 ? (
        <div
          style={{
            padding: "var(--s-20) var(--s-8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-3)",
              marginBottom: "var(--s-5)",
            }}
          />
          <div className="t-display-md">No allocations claimed</div>
          <div
            className="t-body-2"
            style={{ marginTop: "var(--s-3)", maxWidth: 380 }}
          >
            When a host shares a magic link, open it and tap &quot;Claim this
            allocation&quot; to track it here.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "var(--s-8)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--s-4)",
          }}
        >
          {owned.map((o) => {
            const s = statsFor(o.allocation_id);
            const cap = o.allocation.cap;
            const remaining = Math.max(0, cap - s.used);
            const token = tokenMap.get(o.allocation_id);
            const eventDate = new Date(o.allocation.event_night.doors_at);
            const isPast = eventDate.getTime() < now;
            const name = o.allocation.event_night.event.name;
            const isOpen =
              o.allocation.list_open &&
              !o.allocation.event_night.is_frozen;
            const pct = cap > 0 ? Math.min(100, (s.used / cap) * 100) : 0;
            return (
              <div key={o.allocation_id} className="card card--hover">
                <Cover seed={name} height={160}>
                  <div
                    style={{
                      position: "absolute",
                      left: "var(--s-4)",
                      right: "var(--s-4)",
                      bottom: "var(--s-4)",
                    }}
                  >
                    <div
                      className="t-meta"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {fmtDate(o.allocation.event_night.night_date)} · doors{" "}
                      {fmtTime(o.allocation.event_night.doors_at)}
                      {isPast ? " · past" : ""}
                    </div>
                    <div
                      className="t-h1 truncate"
                      style={{ marginTop: "var(--s-1)", color: "#fff" }}
                    >
                      {name}
                    </div>
                  </div>
                </Cover>
                <div style={{ padding: "var(--s-4)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="t-body-2 truncate">
                      {o.allocation.holder_name}
                    </span>
                    <span
                      className={
                        "chip " + (isOpen ? "chip--ok" : "chip--err")
                      }
                    >
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "var(--s-3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="t-body t-num">
                      {s.used} / {cap}
                    </span>
                    {token && !isPast ? (
                      <Link
                        href={`/h/${token}`}
                        target="_blank"
                        className="btn btn--sm btn--ghost"
                        style={{ textDecoration: "none" }}
                      >
                        Open list
                      </Link>
                    ) : (
                      <span className="t-meta">{remaining} left</span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: "var(--s-2)",
                      height: 3,
                      background: "var(--line)",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "var(--fg)",
                        width: `${pct}%`,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div
                    className="t-meta"
                    style={{ marginTop: "var(--s-3)" }}
                  >
                    {s.scanned} scanned · {remaining} left
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="t-meta"
        style={{
          padding: "var(--s-6) var(--s-8) var(--s-12)",
          textAlign: "center",
        }}
      >
        <a
          href="/api/auth/signout"
          style={{ color: "var(--fg-3)", textDecoration: "none" }}
        >
          Sign out
        </a>
      </div>
    </main>
  );
}
