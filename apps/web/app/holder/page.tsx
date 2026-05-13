import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Button } from "@/components/wadl";

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
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">HOLDER DASHBOARD</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Your allocations
          </div>
        </div>

        <section
          className="w-card"
          style={{ padding: 18, marginBottom: 16 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <Stat label="SHOW RATE" value={`${Math.round(showRate * 100)}%`} />
            <Stat
              label="LIFETIME"
              value={totals.scanned}
              tone="ok"
              sub="SCANNED"
            />
            <Stat label="EVENTS" value={totals.events.size} />
          </div>
        </section>

        {owned.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No allocations claimed</div>
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
              When a host shares a magic link, open it and tap &quot;Claim
              this allocation&quot; to track it here.
            </p>
          </div>
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {owned.map((o) => {
              const s = statsFor(o.allocation_id);
              const remaining = Math.max(0, o.allocation.cap - s.used);
              const token = tokenMap.get(o.allocation_id);
              const eventDate = new Date(o.allocation.event_night.doors_at);
              const isPast = eventDate.getTime() < now;
              return (
                <li
                  key={o.allocation_id}
                  className="w-card"
                  style={{ padding: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
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
                        {o.allocation.event_night.event.name}
                      </p>
                      <div className="w-type-meta" style={{ marginTop: 4 }}>
                        {fmtDate(
                          o.allocation.event_night.night_date,
                        ).toUpperCase()}{" "}
                        · DOORS{" "}
                        {fmtTime(
                          o.allocation.event_night.doors_at,
                        ).toUpperCase()}
                        {isPast ? " · PAST" : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--w-display)",
                          fontWeight: 700,
                          fontSize: 22,
                          lineHeight: 1,
                          color: "var(--w-fg)",
                        }}
                      >
                        {s.used}
                        <span style={{ color: "var(--w-fg-muted)" }}>
                          /{o.allocation.cap}
                        </span>
                      </div>
                      <div className="w-type-meta" style={{ marginTop: 4 }}>
                        ON LIST
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      marginTop: 12,
                    }}
                    className="w-type-meta"
                  >
                    <div>
                      <span style={{ color: "var(--w-fg)" }}>
                        {remaining}
                      </span>{" "}
                      LEFT
                    </div>
                    <div>
                      <span style={{ color: "var(--w-ok)" }}>
                        {s.scanned}
                      </span>{" "}
                      SCANNED
                    </div>
                    <div>
                      {o.allocation.list_open &&
                      !o.allocation.event_night.is_frozen ? (
                        <span style={{ color: "var(--w-ok)" }}>OPEN</span>
                      ) : (
                        <span style={{ color: "var(--w-err)" }}>CLOSED</span>
                      )}
                    </div>
                  </div>
                  {token && !isPast && (
                    <Link
                      href={`/h/${token}`}
                      target="_blank"
                      style={{
                        textDecoration: "none",
                        display: "block",
                        marginTop: 12,
                      }}
                    >
                      <Button
                        variant="ghost"
                        style={{ width: "100%", fontSize: 12 }}
                      >
                        Open list →
                      </Button>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div
          className="w-type-meta"
          style={{ marginTop: 32, textAlign: "center" }}
        >
          <a
            href="/api/auth/signout"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            SIGN OUT
          </a>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number | string;
  tone?: "ok";
  sub?: string;
}) {
  const color = tone === "ok" ? "var(--w-ok)" : "var(--w-fg)";
  return (
    <div>
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 6,
          color,
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="w-type-meta" style={{ marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
