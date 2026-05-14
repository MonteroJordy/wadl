import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";
import EscalateButton from "@/components/escalate-button";
import StatusLegend from "@/components/status-legend";

export const dynamic = "force-dynamic";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

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
    searchParams.night,
  );

  let inCount = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let lastScan: { name: string; tier: string; at: string } | null = null;
  if (active) {
    const [checkInsRes, guestsRes, lastScanRes] = await Promise.all([
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
      admin
        .from("check_ins")
        .select(
          "created_at, guest:guests!inner(full_name, tier)",
        )
        .eq("event_night_id", active.id)
        .eq("state", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    inCount = checkInsRes.count ?? 0;
    for (const g of guestsRes.data ?? []) {
      if (g.status === "approved")
        approvedCount += 1 + (g.plus_ones ?? 0);
      else if (g.status === "pending")
        pendingCount += 1 + (g.plus_ones ?? 0);
    }
    const ls = lastScanRes.data as
      | {
          created_at: string;
          guest: { full_name: string; tier: string } | null;
        }
      | null;
    if (ls?.guest) {
      lastScan = {
        name: ls.guest.full_name,
        tier: ls.guest.tier,
        at: ls.created_at,
      };
    }
  }

  const capacity = active?.capacity_cap ?? 0;
  const pct =
    capacity > 0 ? Math.round((inCount / capacity) * 100) : 0;

  return (
    <main id="main-content" className="v5">
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        {/* ── Header row — Tonight · live + event name + scanning pulse ── */}
        <div
          style={{
            padding: "var(--s-6) var(--s-8)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--s-6)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="t-meta">Tonight · live</div>
            <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
              {resolved.event.name}
            </div>
            {active ? (
              <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                {fmtDate(active.night_date)} · doors{" "}
                {fmtTime(active.doors_at)}
                {active.is_frozen ? " · frozen" : ""}
              </div>
            ) : null}
          </div>
          {active ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--s-2)",
              }}
            >
              <div
                className="pulse"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "var(--r-pill)",
                  background: "var(--ok)",
                }}
              />
              <span className="t-meta">Scanning</span>
            </div>
          ) : null}
        </div>

        {/* Multi-night picker */}
        {nights.length > 1 && active ? (
          <div
            style={{
              padding: "var(--s-4) var(--s-8) 0",
              display: "flex",
              gap: "var(--s-2)",
              overflowX: "auto",
            }}
            className="noscroll"
          >
            {nights.map((n) => {
              const isActive = n.id === active.id;
              return (
                <Link
                  key={n.id}
                  href={`/door/events/${params.id}?night=${n.id}`}
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <span
                    className={"chip " + (isActive ? "" : "chip--ghost")}
                  >
                    {fmtDate(n.night_date)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}

        {active ? (
          <>
            {/* ── 2-col body ── */}
            <div
              style={{
                padding: "var(--s-8)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-4)",
              }}
            >
              {/* Left — giant checked-in count */}
              <div
                className="card"
                style={{ padding: "var(--s-8)", textAlign: "center" }}
              >
                <div className="t-meta">Checked in</div>
                <div
                  className="t-num"
                  style={{
                    fontSize: 96,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginTop: "var(--s-3)",
                  }}
                >
                  {inCount}
                </div>
                <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
                  {capacity ? `of ${capacity} · ${pct}% cap` : "no cap set"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--s-2)",
                    justifyContent: "center",
                    marginTop: "var(--s-4)",
                  }}
                >
                  <span className="chip chip--ok">
                    {approvedCount} approved
                  </span>
                  {pendingCount > 0 && (
                    <span className="chip chip--warn">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: "var(--s-5)",
                    padding: "var(--s-3) var(--s-4)",
                    background: "var(--bg-3)",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <div className="t-meta">
                    {lastScan ? `Last · ${relTime(lastScan.at)}` : "Last scan"}
                  </div>
                  <div className="t-h1" style={{ marginTop: "var(--s-1)" }}>
                    {lastScan
                      ? `${lastScan.name} · ${lastScan.tier
                          .replace(/_/g, " ")
                          .toUpperCase()}`
                      : "No scans yet"}
                  </div>
                </div>
              </div>

              {/* Right — action stack + briefing */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                <Link
                  href={`/door/events/${params.id}/scan?night=${active.id}`}
                  className="btn btn--xl btn--block"
                >
                  Open scanner
                </Link>
                <Link
                  href={`/door/events/${params.id}/search?night=${active.id}`}
                  className="btn btn--ghost btn--xl btn--block"
                >
                  Manual lookup
                </Link>
                <Link
                  href={`/door/events/${params.id}/search?night=${active.id}&walkin=1`}
                  className="btn btn--ghost btn--xl btn--block"
                >
                  Add walk-in
                </Link>

                <div
                  className="card"
                  style={{ padding: "var(--s-5)", marginTop: "var(--s-2)" }}
                >
                  <div className="t-meta">Briefing</div>
                  <div
                    style={{
                      marginTop: "var(--s-3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--s-2)",
                    }}
                  >
                    {[
                      "Scan or search only — no overrides at the door",
                      "Same QR twice means already in — wave them through",
                      "Flagged or denied — hold them, escalate",
                    ].map((t) => (
                      <div
                        key={t}
                        className="t-body-2"
                        style={{ display: "flex", gap: "var(--s-2)" }}
                      >
                        <span style={{ color: "var(--fg-4)" }}>·</span>
                        {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "var(--s-4)" }}>
                    <StatusLegend kind="scan" variant="collapsible" />
                  </div>
                </div>

                {resolved.role !== "door_manager" && (
                  <div style={{ marginTop: "var(--s-2)" }}>
                    <EscalateButton eventId={params.id} />
                  </div>
                )}

                {resolved.role === "door_manager" && (
                  <Link
                    href={`/manager/events/${params.id}`}
                    className="t-meta"
                    style={{
                      marginTop: "var(--s-2)",
                      color: "var(--warn)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "var(--s-2)",
                    }}
                  >
                    Manager view →
                  </Link>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "var(--s-8)" }}>
            <div
              className="card"
              style={{ padding: "var(--s-8)", textAlign: "center" }}
            >
              <div className="t-meta">No nights yet</div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--s-3)",
            padding: "var(--s-6) var(--s-8) var(--s-8)",
          }}
        >
          <span className="t-meta" style={{ color: "var(--fg-4)" }}>
            Staff · scan or search only
          </span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="t-meta"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--fg-4)",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
