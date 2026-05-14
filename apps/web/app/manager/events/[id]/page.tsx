import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";
import GuestRow from "./guest-row";

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
    searchParams.night,
  );

  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    (searchParams.status ?? "all") as StatusFilter,
  )
    ? (searchParams.status as StatusFilter)
    : "all";
  const tierFilter: TierFilter = TIER_FILTERS.includes(
    (searchParams.tier ?? "all") as TierFilter,
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
          "id, full_name, plus_ones, tier, status, flag_dna, allocation:allocations(holder_name), check_ins(scanned_at, state)",
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
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-24)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: "var(--s-4)",
            marginBottom: "var(--s-4)",
          }}
        >
          <div>
            <div className="t-meta">Manager</div>
            <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
              {resolved.event.name}
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="t-meta"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Sign out
            </button>
          </form>
        </div>

        {active ? (
          <>
            <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
              {fmtDate(active.night_date)} · Doors {fmtTime(active.doors_at)}
              {active.is_frozen ? " · Frozen" : ""}
            </div>

            {nights.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  overflowX: "auto",
                  marginBottom: "var(--s-4)",
                }}
              >
                {nights.map((n) => {
                  const isActive = n.id === active.id;
                  return (
                    <Link
                      key={n.id}
                      href={`/manager/events/${params.id}?night=${n.id}`}
                      style={{ textDecoration: "none", flexShrink: 0 }}
                    >
                      <span
                        className={
                          isActive ? "chip chip--solid" : "chip chip--ghost"
                        }
                      >
                        {fmtDate(n.night_date)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            <section
              className="card"
              style={{
                padding: "var(--s-6)",
                marginBottom: "var(--s-4)",
              }}
            >
              <div className="t-meta">In</div>
              <div
                className="t-num"
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  marginTop: "var(--s-2)",
                  color: "var(--fg)",
                }}
              >
                {inCount}
                <span style={{ color: "var(--fg-3)", fontSize: 32 }}>
                  /{capacity || "—"}
                </span>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-2)",
                marginBottom: "var(--s-5)",
              }}
            >
              <Link
                href={`/door/events/${params.id}/scan?night=${active.id}`}
                className="card card--hover"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "var(--s-4)",
                  borderColor: "var(--ok)",
                }}
              >
                <div
                  className="t-h1"
                  style={{ color: "var(--ok)" }}
                >
                  Scan
                </div>
              </Link>
              <Link
                href={`/door/events/${params.id}/search?night=${active.id}`}
                className="card card--hover"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "var(--s-4)",
                }}
              >
                <div className="t-h1">Search</div>
              </Link>
              <Link
                href={`/manager/events/${params.id}/add?night=${active.id}`}
                className="card card--hover"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "var(--s-4)",
                  borderColor: "var(--line-3)",
                }}
              >
                <div className="t-h1">+ Add</div>
              </Link>
            </section>

            <section style={{ marginBottom: "var(--s-3)" }}>
              <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
                Status
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  overflowX: "auto",
                  paddingBottom: "var(--s-1)",
                }}
              >
                {STATUS_FILTERS.map((s) => {
                  const isActive = s === statusFilter;
                  return (
                    <Link
                      key={s}
                      href={filterLink("status", s)}
                      style={{ textDecoration: "none", flexShrink: 0 }}
                    >
                      <span
                        className={
                          isActive ? "chip chip--solid" : "chip chip--ghost"
                        }
                      >
                        {s === "in" ? "Checked in" : s}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section style={{ marginBottom: "var(--s-4)" }}>
              <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
                Tier
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  overflowX: "auto",
                  paddingBottom: "var(--s-1)",
                }}
              >
                {TIER_FILTERS.map((t) => {
                  const isActive = t === tierFilter;
                  return (
                    <Link
                      key={t}
                      href={filterLink("tier", t)}
                      style={{ textDecoration: "none", flexShrink: 0 }}
                    >
                      <span
                        className={
                          isActive ? "chip chip--solid" : "chip chip--ghost"
                        }
                      >
                        {t.replace("_", " ")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
              {filtered.length} / {rows.length} showing
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
              }}
            >
              {filtered.map((g) => {
                const approvedScan = g.check_ins.find(
                  (c) => c.state === "approved",
                );
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
              <div
                className="card"
                style={{
                  padding: "var(--s-12) var(--s-8)",
                  textAlign: "center",
                  marginTop: "var(--s-3)",
                }}
              >
                <div className="t-h1">Nothing matches</div>
                <p
                  className="t-body-2"
                  style={{
                    marginTop: "var(--s-3)",
                    maxWidth: 400,
                    marginInline: "auto",
                  }}
                >
                  {rows.length === 0
                    ? "No guests yet — wait for RSVPs or add a walk-up."
                    : "Clear your filters to see everyone."}
                </p>
              </div>
            )}
          </>
        ) : (
          <div
            className="card"
            style={{
              padding: "var(--s-12) var(--s-8)",
              textAlign: "center",
            }}
          >
            <div className="t-h1">No nights yet</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 400,
                marginInline: "auto",
              }}
            >
              The event has no nights defined. Ask the owner to add one.
            </p>
          </div>
        )}

        <div
          className="t-meta"
          style={{ marginTop: "var(--s-8)", textAlign: "center" }}
        >
          Manager — approve, check in, and add walk-ups
        </div>
      </div>
    </main>
  );
}
