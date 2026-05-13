import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";
import { Chip } from "@/components/wadl";
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
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div className="w-type-meta" style={{ color: "var(--w-acc)" }}>
              MANAGER
            </div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              {resolved.event.name}
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-type-meta"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--w-fg-muted)",
                padding: 0,
              }}
            >
              SIGN OUT
            </button>
          </form>
        </div>

        {active ? (
          <>
            <div className="w-type-meta" style={{ marginBottom: 16 }}>
              {fmtDate(active.night_date).toUpperCase()} · DOORS{" "}
              {fmtTime(active.doors_at).toUpperCase()}
              {active.is_frozen ? " · FROZEN" : ""}
            </div>

            {nights.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  marginBottom: 16,
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
                      <Chip tone={isActive ? "acc" : "ghost"}>
                        {fmtDate(n.night_date).toUpperCase()}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            )}

            <section
              className="w-card"
              style={{
                padding: 18,
                borderColor: "var(--w-acc)",
                background: "var(--w-acc-soft)",
                marginBottom: 16,
              }}
            >
              <div
                className="w-type-meta"
                style={{ color: "var(--w-acc-ink)" }}
              >
                IN
              </div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  marginTop: 8,
                  color: "var(--w-acc-ink)",
                }}
              >
                {inCount}
                <span
                  style={{
                    color: "var(--w-fg-muted)",
                    fontSize: 32,
                  }}
                >
                  /{capacity || "—"}
                </span>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <Link
                href={`/door/events/${params.id}/scan?night=${active.id}`}
                className="w-card"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: 16,
                  borderColor: "var(--w-ok)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--w-ok)",
                  }}
                >
                  SCAN
                </div>
              </Link>
              <Link
                href={`/door/events/${params.id}/search?night=${active.id}`}
                className="w-card"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--w-fg)",
                  }}
                >
                  SEARCH
                </div>
              </Link>
              <Link
                href={`/manager/events/${params.id}/add?night=${active.id}`}
                className="w-card"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                  padding: 16,
                  borderColor: "var(--w-acc)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 22,
                    color: "var(--w-acc)",
                  }}
                >
                  + ADD
                </div>
              </Link>
            </section>

            <section style={{ marginBottom: 12 }}>
              <div className="w-type-meta" style={{ marginBottom: 6 }}>
                STATUS
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
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
                      <Chip tone={isActive ? "acc" : "ghost"}>
                        {(s === "in" ? "CHECKED IN" : s).toUpperCase()}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section style={{ marginBottom: 16 }}>
              <div className="w-type-meta" style={{ marginBottom: 6 }}>
                TIER
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
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
                      <Chip tone={isActive ? "acc" : "ghost"}>
                        {t.replace("_", " ").toUpperCase()}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="w-type-meta" style={{ marginBottom: 8 }}>
              {filtered.length} / {rows.length} SHOWING
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
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
                className="w-card"
                style={{
                  padding: "48px 32px",
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                <div className="w-type-h1">Nothing matches</div>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg-muted)",
                    marginTop: 12,
                    maxWidth: 400,
                    marginInline: "auto",
                    lineHeight: 1.5,
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
            className="w-card"
            style={{
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No nights yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 400,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              The event has no nights defined. Ask the owner to add one.
            </p>
          </div>
        )}

        <div
          className="w-type-meta"
          style={{
            marginTop: 32,
            textAlign: "center",
            color: "var(--w-acc)",
          }}
        >
          MANAGER — APPROVE, CHECK IN, AND ADD WALK-UPS
        </div>
      </div>
    </main>
  );
}
