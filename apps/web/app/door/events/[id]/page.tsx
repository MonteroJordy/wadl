import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDoorContext, resolveActiveNight } from "@/lib/door";
import { fmtDate, fmtTime } from "@/lib/format";
import EscalateButton from "@/components/escalate-button";
import StatusLegend from "@/components/status-legend";
import {
  CapacityMeter,
  Chip,
  IconArrow,
  IconQr,
  IconSearch,
  WFrame,
  Wordmark,
} from "@/components/wadl";

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
    searchParams.night,
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
      if (g.status === "approved")
        approvedCount += 1 + (g.plus_ones ?? 0);
      else if (g.status === "pending")
        pendingCount += 1 + (g.plus_ones ?? 0);
    }
  }

  const capacity = active?.capacity_cap ?? 0;
  const pct =
    capacity > 0 ? Math.round((inCount / capacity) * 100) : 0;

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 32, background: "#000" }}>
        {/* Top status bar */}
        <div
          style={{
            padding: "16px 20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              className="w-type-meta"
              style={{
                color: "var(--w-acc)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                className="w-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  background: "currentColor",
                  display: "inline-block",
                }}
              />
              LIVE · {resolved.event.name.toUpperCase()}
            </div>
            {active ? (
              <div
                style={{
                  fontFamily: "var(--w-mono)",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <strong style={{ color: "var(--w-fg)" }}>{inCount}</strong>
                <span style={{ color: "var(--w-fg-dim)" }}>
                  {capacity ? ` / ${capacity}` : ""}
                  {capacity ? ` · ${pct}%` : ""}
                </span>
              </div>
            ) : null}
          </div>
          <Wordmark variant="monogrid" size={14} />
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div className="w-type-meta">DOOR</div>
          <div className="w-type-display-md" style={{ marginTop: 6 }}>
            {resolved.event.name}
          </div>
          {active ? (
            <div className="w-type-meta" style={{ marginTop: 8 }}>
              {fmtDate(active.night_date).toUpperCase()} · DOORS{" "}
              {fmtTime(active.doors_at).toUpperCase()}
              {active.is_frozen ? " · FROZEN" : ""}
            </div>
          ) : null}
        </div>

        {/* Status key — always visible so staff can decode tones at a
            glance during a busy door. Collapsed by default to save room. */}
        <div style={{ padding: "12px 20px 0" }}>
          <StatusLegend kind="scan" variant="collapsible" />
        </div>

        {/* Multi-night picker */}
        {nights.length > 1 && active ? (
          <div
            style={{
              padding: "16px 20px 0",
              display: "flex",
              gap: 6,
              overflowX: "auto",
            }}
            className="w-noscroll"
          >
            {nights.map((n) => {
              const isActive = n.id === active.id;
              return (
                <Link
                  key={n.id}
                  href={`/door/events/${params.id}?night=${n.id}`}
                  style={{
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  <Chip tone={isActive ? "neutral" : "ghost"}>
                    {fmtDate(n.night_date).toUpperCase()}
                  </Chip>
                </Link>
              );
            })}
          </div>
        ) : null}

        {active ? (
          <>
            {/* Big-stat IN card */}
            <div style={{ padding: "24px 20px 0" }}>
              <div
                className="w-card"
                style={{
                  padding: 22,
                  borderColor: "var(--w-acc)",
                  background: "var(--w-acc-soft)",
                }}
              >
                <div
                  className="w-type-meta"
                  style={{ color: "var(--w-acc)" }}
                >
                  IN
                </div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontSize: 88,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.92,
                    marginTop: 4,
                  }}
                >
                  {inCount}
                  <span style={{ color: "var(--w-fg-dim)", fontSize: 44 }}>
                    {capacity ? `/${capacity}` : ""}
                  </span>
                </div>
                {capacity > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <CapacityMeter
                      current={inCount}
                      total={capacity}
                      accent
                      label="CAPACITY"
                    />
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip tone="ok">{approvedCount} APPROVED</Chip>
                  {pendingCount > 0 && (
                    <Chip tone="warn">{pendingCount} PENDING</Chip>
                  )}
                </div>
              </div>
            </div>

            {/* Action grid */}
            <div
              style={{
                padding: "16px 20px 0",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <Link
                href={`/door/events/${params.id}/scan?night=${active.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="w-card"
                  style={{
                    padding: 24,
                    textAlign: "center",
                    borderColor: "var(--w-acc)",
                    background: "var(--w-acc-soft)",
                    color: "var(--w-fg)",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      margin: "0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--w-acc)",
                    }}
                  >
                    <IconQr size={32} />
                  </div>
                  <div
                    className="w-type-display-md"
                    style={{ marginTop: 8, fontSize: 28 }}
                  >
                    Scan
                  </div>
                  <div className="w-type-meta" style={{ marginTop: 4 }}>
                    CAMERA QR
                  </div>
                </div>
              </Link>
              <Link
                href={`/door/events/${params.id}/search?night=${active.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="w-card"
                  style={{
                    padding: 24,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      margin: "0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--w-fg)",
                    }}
                  >
                    <IconSearch size={32} />
                  </div>
                  <div
                    className="w-type-display-md"
                    style={{ marginTop: 8, fontSize: 28 }}
                  >
                    Search
                  </div>
                  <div className="w-type-meta" style={{ marginTop: 4 }}>
                    BY NAME
                  </div>
                </div>
              </Link>
            </div>

            {resolved.role !== "door_manager" && (
              <div style={{ padding: "32px 20px 0" }}>
                <EscalateButton eventId={params.id} />
              </div>
            )}

            {resolved.role === "door_manager" && (
              <div
                style={{ padding: "24px 20px 0", textAlign: "center" }}
              >
                <Link
                  href={`/manager/events/${params.id}`}
                  style={{
                    color: "var(--w-warn)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  className="w-type-meta"
                >
                  MANAGER VIEW <IconArrow size={12} />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "32px 20px 0" }}>
            <div
              className="w-card"
              style={{ padding: 24, textAlign: "center" }}
            >
              <div className="w-type-meta">NO NIGHTS YET</div>
            </div>
          </div>
        )}

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 24,
            paddingBottom: 12,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          STAFF · SCAN OR SEARCH ONLY
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-type-meta"
              style={{
                background: "transparent",
                border: 0,
                color: "var(--w-fg-dim)",
                cursor: "pointer",
              }}
            >
              SIGN OUT
            </button>
          </form>
        </div>
      </WFrame>
    </main>
  );
}
