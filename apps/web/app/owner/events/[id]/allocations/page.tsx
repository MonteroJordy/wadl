import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";

export const dynamic = "force-dynamic";

interface NightLite {
  id: string;
  night_date: string;
  doors_at: string;
}

interface AllocationRow {
  id: string;
  event_night_id: string;
  holder_name: string;
  cap: number;
  auto_approve: boolean;
  list_open: boolean;
}

interface GuestCount {
  allocation_id: string | null;
  plus_ones: number;
  status: string;
}

export default async function AllocationsPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id, event_nights(id, night_date, doors_at)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = ((event.event_nights ?? []) as NightLite[]).sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1,
  );

  const nightIds = nights.map((n) => n.id);
  let allocs: AllocationRow[] = [];
  let guests: GuestCount[] = [];
  if (nightIds.length > 0) {
    const [aRes, gRes] = await Promise.all([
      supabase
        .from("allocations")
        .select(
          "id, event_night_id, holder_name, cap, auto_approve, list_open",
        )
        .in("event_night_id", nightIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("guests")
        .select("allocation_id, plus_ones, status")
        .in("event_night_id", nightIds)
        .in("status", ["approved", "pending"]),
    ]);
    allocs = (aRes.data ?? []) as AllocationRow[];
    guests = (gRes.data ?? []) as GuestCount[];
  }

  const usedByAlloc = new Map<string, number>();
  for (const g of guests) {
    if (!g.allocation_id) continue;
    const add = 1 + (g.plus_ones ?? 0);
    usedByAlloc.set(
      g.allocation_id,
      (usedByAlloc.get(g.allocation_id) ?? 0) + add,
    );
  }

  const byNight = new Map<string, AllocationRow[]>();
  for (const a of allocs) {
    if (!byNight.has(a.event_night_id)) byNight.set(a.event_night_id, []);
    byNight.get(a.event_night_id)!.push(a);
  }

  const totalCap = allocs.reduce((s, a) => s + a.cap, 0);
  const totalUsed = Array.from(usedByAlloc.values()).reduce(
    (s, n) => s + n,
    0,
  );
  const fillPct =
    totalCap === 0 ? 0 : Math.round((totalUsed / totalCap) * 100);
  const fillTone = fillPct >= 90 ? "err" : fillPct >= 70 ? "warn" : "ok";

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Allocations",
        ]}
      />
      <PageHeader
        eyebrow="Allocations"
        title="Hand the door out"
        sub={`${allocs.length} ${
          allocs.length === 1 ? "holder" : "holders"
        } · ${totalUsed}/${totalCap} used`}
        actions={
          <Link
            href={`/owner/events/${event.id}/allocations/new`}
            className="btn"
            style={{ textDecoration: "none" }}
          >
            New allocation
          </Link>
        }
      />
      <EventSubNav active="guests" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {/* Aggregate fill */}
        {totalCap > 0 && (
          <div className="card" style={{ padding: "var(--s-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--s-3)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="t-meta">Total capacity across holders</div>
                <div
                  className="t-display-md t-num"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  {totalUsed}
                  <span style={{ color: "var(--fg-4)" }}>/{totalCap}</span>
                </div>
              </div>
              <span className={`chip chip--${fillTone}`}>
                {fillPct}% filled
              </span>
            </div>
            <div
              style={{
                marginTop: "var(--s-4)",
                height: 6,
                borderRadius: "var(--r-pill)",
                background: "var(--bg-3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(fillPct, 100)}%`,
                  background:
                    fillTone === "err"
                      ? "var(--err)"
                      : fillTone === "warn"
                        ? "var(--warn)"
                        : "var(--fg)",
                }}
              />
            </div>
          </div>
        )}

        {nights.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
              marginTop: "var(--s-6)",
            }}
          >
            <div className="t-h1">No nights yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 420,
                marginInline: "auto",
              }}
            >
              Add nights from settings, then come back to distribute the list.
            </div>
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="btn"
              style={{
                marginTop: "var(--s-6)",
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Open settings
            </Link>
          </div>
        ) : allocs.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
              marginTop: "var(--s-6)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--r-lg)",
                background: "var(--bg-3)",
                margin: "0 auto var(--s-5)",
              }}
            />
            <div className="t-h1">No allocations yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Drop a promoter, artist, or brand a magic link. They add names up
              to their cap. Every name gets attributed back to them — feeds the
              scorecards.
            </div>
            <Link
              href={`/owner/events/${event.id}/allocations/new`}
              className="btn"
              style={{
                marginTop: "var(--s-6)",
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Add first allocation
            </Link>
          </div>
        ) : (
          <div
            style={{
              marginTop: "var(--s-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-8)",
            }}
          >
            {nights.map((n) => {
              const list = byNight.get(n.id) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={n.id}>
                  <div
                    className="t-meta"
                    style={{ marginBottom: "var(--s-3)" }}
                  >
                    {fmtDate(n.night_date)} · {list.length}{" "}
                    {list.length === 1 ? "holder" : "holders"}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(320px, 1fr))",
                      gap: "var(--s-3)",
                    }}
                  >
                    {list.map((a) => {
                      const used = usedByAlloc.get(a.id) ?? 0;
                      const pct = a.cap === 0 ? 0 : (used / a.cap) * 100;
                      const tone =
                        pct >= 100 ? "err" : pct >= 80 ? "warn" : "ok";
                      return (
                        <Link
                          key={a.id}
                          href={`/owner/events/${event.id}/allocations/${a.id}`}
                          className="card card--hover"
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                            padding: "var(--s-5)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "var(--s-3)",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="t-h1 truncate">
                                {a.holder_name}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "var(--s-1)",
                                  marginTop: "var(--s-2)",
                                }}
                              >
                                {a.auto_approve && (
                                  <span className="chip chip--ok">
                                    Auto-approve
                                  </span>
                                )}
                                {!a.list_open && (
                                  <span className="chip chip--err">
                                    Closed
                                  </span>
                                )}
                                {a.list_open && !a.auto_approve && (
                                  <span className="chip chip--ghost">
                                    Host approves
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className="t-display-md t-num"
                              style={{ textAlign: "right" }}
                            >
                              {used}
                              <span style={{ color: "var(--fg-4)" }}>
                                /{a.cap}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              marginTop: "var(--s-4)",
                              height: 6,
                              borderRadius: "var(--r-pill)",
                              background: "var(--bg-3)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(pct, 100)}%`,
                                background:
                                  tone === "err"
                                    ? "var(--err)"
                                    : tone === "warn"
                                      ? "var(--warn)"
                                      : "var(--fg)",
                              }}
                            />
                          </div>
                          <div
                            className="t-meta"
                            style={{ marginTop: "var(--s-2)" }}
                          >
                            {Math.round(pct)}% filled
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
