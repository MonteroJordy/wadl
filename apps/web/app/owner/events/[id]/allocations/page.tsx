import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { Button, CapacityMeter, Chip, IconPlus } from "@/components/wadl";

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
    if (!byNight.has(a.event_night_id))
      byNight.set(a.event_night_id, []);
    byNight.get(a.event_night_id)!.push(a);
  }

  const totalCap = allocs.reduce((s, a) => s + a.cap, 0);
  const totalUsed = Array.from(usedByAlloc.values()).reduce(
    (s, n) => s + n,
    0,
  );
  const fillPct =
    totalCap === 0 ? 0 : Math.round((totalUsed / totalCap) * 100);
  const fillTone =
    fillPct >= 90 ? "err" : fillPct >= 70 ? "warn" : "ok";

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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          ← {event.name.toUpperCase()}
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginTop: 16,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="w-type-meta">ALLOCATIONS</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Hand the door out
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {allocs.length}{" "}
              {allocs.length === 1 ? "holder" : "holders"} · {totalUsed}/
              {totalCap} used
            </p>
          </div>
          <Link
            href={`/owner/events/${event.id}/allocations/new`}
            style={{ textDecoration: "none" }}
          >
            <Button variant="primary">
              <IconPlus size={14} /> New allocation
            </Button>
          </Link>
        </div>

        {/* Aggregate fill */}
        {totalCap > 0 && (
          <div
            className="w-card"
            style={{ padding: 18, marginTop: 24 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="w-type-meta">TOTAL CAPACITY ACROSS HOLDERS</div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                    marginTop: 6,
                  }}
                >
                  {totalUsed}
                  <span style={{ color: "var(--w-fg-dim)" }}>
                    /{totalCap}
                  </span>
                </div>
              </div>
              <Chip tone={fillTone}>{fillPct}% FILLED</Chip>
            </div>
            <div style={{ marginTop: 14 }}>
              <CapacityMeter
                current={totalUsed}
                total={totalCap}
                accent={fillTone === "ok"}
                label="USED"
              />
            </div>
          </div>
        )}

        {nights.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <div className="w-type-h1">No nights yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 420,
                marginInline: "auto",
              }}
            >
              Add nights from settings, then come back to distribute the list.
            </p>
            <Link
              href={`/owner/events/${event.id}/settings`}
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Open settings
            </Link>
          </div>
        ) : allocs.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 24,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                background: "var(--w-acc)",
                color: "var(--w-acc-ink)",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              +
            </div>
            <div className="w-type-h1">No allocations yet</div>
            <p
              className="w-type-body-sm"
              style={{
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Drop a promoter, artist, or brand a magic link. They add names
              up to their cap. Every name gets attributed back to them — feeds
              the scorecards.
            </p>
            <Link
              href={`/owner/events/${event.id}/allocations/new`}
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              <IconPlus size={14} /> Add first allocation
            </Link>
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            {nights.map((n) => {
              const list = byNight.get(n.id) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={n.id}>
                  <div
                    className="w-type-meta"
                    style={{ marginBottom: 12 }}
                  >
                    {fmtDate(n.night_date).toUpperCase()} · {list.length}{" "}
                    {list.length === 1 ? "HOLDER" : "HOLDERS"}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(320px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {list.map((a) => {
                      const used = usedByAlloc.get(a.id) ?? 0;
                      const pct = a.cap === 0 ? 0 : (used / a.cap) * 100;
                      const tone =
                        pct >= 100
                          ? "err"
                          : pct >= 80
                            ? "warn"
                            : "ok";
                      return (
                        <Link
                          key={a.id}
                          href={`/owner/events/${event.id}/allocations/${a.id}`}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div
                            className="w-card"
                            style={{ padding: 16 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 12,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 16,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {a.holder_name}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 6,
                                    marginTop: 6,
                                  }}
                                >
                                  {a.auto_approve && (
                                    <Chip tone="ok">AUTO-APPROVE</Chip>
                                  )}
                                  {!a.list_open && (
                                    <Chip tone="err">CLOSED</Chip>
                                  )}
                                  {a.list_open && !a.auto_approve && (
                                    <Chip tone="ghost">HOST APPROVES</Chip>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div
                                  style={{
                                    fontFamily: "var(--w-display)",
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: "-0.025em",
                                    lineHeight: 1,
                                  }}
                                >
                                  {used}
                                  <span
                                    style={{
                                      color: "var(--w-fg-dim)",
                                      fontSize: 18,
                                    }}
                                  >
                                    /{a.cap}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                              <CapacityMeter
                                current={used}
                                total={a.cap}
                                accent={tone === "ok"}
                                label={`${Math.round(pct)}% FILLED`}
                              />
                            </div>
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
