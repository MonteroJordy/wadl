import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRecap } from "@/lib/recap";
import ComparePicker from "./picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare events — WADL" };

interface EventLite {
  id: string;
  name: string;
  doors: string;
}

type DiffTone = "ok" | "err" | "muted";

function diffTone(tone: DiffTone): string {
  if (tone === "ok") return "var(--w-ok)";
  if (tone === "err") return "var(--w-err)";
  return "var(--w-fg-muted)";
}

function diffPct(a: number, b: number): { label: string; tone: DiffTone } {
  if (b === 0) return { label: "—", tone: "muted" };
  const pct = ((a - b) / b) * 100;
  const sign = pct > 0 ? "+" : "";
  const tone: DiffTone = pct > 0 ? "ok" : pct < 0 ? "err" : "muted";
  return { label: `${sign}${Math.round(pct)}%`, tone };
}

export default async function CompareEventsPage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: evRaw } = await admin
    .from("events")
    .select("id, name, event_nights(doors_at)")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const events: EventLite[] = (
    (evRaw ?? []) as Array<{
      id: string;
      name: string;
      event_nights: Array<{ doors_at: string }>;
    }>
  )
    .map((e) => ({
      id: e.id,
      name: e.name,
      doors:
        e.event_nights.sort((x, y) => (x.doors_at < y.doors_at ? -1 : 1))[0]
          ?.doors_at ?? "",
    }))
    .filter((e) => e.doors)
    .sort((x, y) => (x.doors < y.doors ? 1 : -1));

  if (events.length < 2) {
    return (
      <div
        className="w-card"
        style={{
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        <div className="w-type-h1">Need a second night</div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 480,
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          Two nights with check-ins unlock side-by-side. Pace this Friday vs.
          last; promoter-by-promoter deltas; what changed and why.
        </p>
      </div>
    );
  }

  const aId = searchParams.a ?? events[0]?.id;
  const bId = searchParams.b ?? events[1]?.id;

  const [recapA, recapB] = await Promise.all([
    computeRecap(aId),
    computeRecap(bId),
  ]);

  const evA = events.find((e) => e.id === aId);
  const evB = events.find((e) => e.id === bId);

  const showA = recapA.showRate;
  const showB = recapB.showRate;
  const showDiff = diffPct(showA, showB);
  const scannedDiff = diffPct(recapA.totalCheckedIn, recapB.totalCheckedIn);
  const approvedDiff = diffPct(recapA.totalApproved, recapB.totalApproved);

  const tierKeys = Array.from(
    new Set([
      ...recapA.tiers.map((t) => t.tier),
      ...recapB.tiers.map((t) => t.tier),
    ]),
  );

  const holderKeys = Array.from(
    new Set([
      ...recapA.topHolders.map((h) => h.holder_name),
      ...recapB.topHolders.map((h) => h.holder_name),
    ]),
  );
  const holderRows = holderKeys
    .map((name) => {
      const a = recapA.topHolders.find((h) => h.holder_name === name);
      const b = recapB.topHolders.find((h) => h.holder_name === name);
      return {
        name,
        a: a?.scanned ?? 0,
        b: b?.scanned ?? 0,
        aShow: a?.showRate ?? 0,
        bShow: b?.showRate ?? 0,
      };
    })
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
    .slice(0, 8);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <div className="w-card" style={{ padding: 18 }}>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            EVENT A
          </div>
          <ComparePicker side="a" events={events} current={aId} />
          {evA && (
            <p
              style={{
                marginTop: 12,
                color: "var(--w-fg)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {evA.name}
            </p>
          )}
        </div>
        <div className="w-card" style={{ padding: 18 }}>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            EVENT B
          </div>
          <ComparePicker side="b" events={events} current={bId} />
          {evB && (
            <p
              style={{
                marginTop: 12,
                color: "var(--w-fg)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {evB.name}
            </p>
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <DiffKPI
          label="SHOW RATE"
          a={`${Math.round(showA * 100)}%`}
          b={`${Math.round(showB * 100)}%`}
          diff={showDiff}
        />
        <DiffKPI
          label="SCANNED"
          a={recapA.totalCheckedIn}
          b={recapB.totalCheckedIn}
          diff={scannedDiff}
        />
        <DiffKPI
          label="APPROVED"
          a={recapA.totalApproved}
          b={recapB.totalApproved}
          diff={approvedDiff}
        />
      </section>

      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          BY TIER · APPROVED &amp; SHOW RATE
        </div>
        {tierKeys.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            No tier data on either event yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tierKeys.map((tier) => {
              const a = recapA.tiers.find((t) => t.tier === tier);
              const b = recapB.tiers.find((t) => t.tier === tier);
              const aApproved = a?.approved ?? 0;
              const bApproved = b?.approved ?? 0;
              const aShow = a?.showRate ?? 0;
              const bShow = b?.showRate ?? 0;
              const apprDiff = diffPct(aApproved, bApproved);
              const showTone: DiffTone =
                aShow > bShow ? "ok" : aShow < bShow ? "err" : "muted";
              const showLabel =
                bShow === 0
                  ? "—"
                  : `${aShow > bShow ? "+" : ""}${Math.round(
                      (aShow - bShow) * 100,
                    )}pt`;
              return (
                <div
                  key={tier}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 1fr 80px",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: "1px solid var(--w-line)",
                  }}
                >
                  <div
                    className="w-type-meta"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {tier.toUpperCase()}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, color: "var(--w-fg)" }}>
                      {aApproved}{" "}
                      <span style={{ color: "var(--w-fg-muted)" }}>
                        approved
                      </span>
                    </div>
                    <div className="w-type-meta">
                      {Math.round(aShow * 100)}% SHOW
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, color: "var(--w-fg)" }}>
                      {bApproved}{" "}
                      <span style={{ color: "var(--w-fg-muted)" }}>
                        approved
                      </span>
                    </div>
                    <div className="w-type-meta">
                      {Math.round(bShow * 100)}% SHOW
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className="w-type-meta"
                      style={{ color: diffTone(apprDiff.tone) }}
                    >
                      {apprDiff.label}
                    </div>
                    <div
                      className="w-type-meta"
                      style={{ color: diffTone(showTone) }}
                    >
                      {showLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="w-card" style={{ padding: 20 }}>
        <div className="w-type-meta" style={{ marginBottom: 14 }}>
          TOP HOLDERS · SCANNED HEADS
        </div>
        {holderRows.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            No holder activity to compare.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {holderRows.map((r) => {
              const delta = r.a - r.b;
              const tone: DiffTone =
                delta > 0 ? "ok" : delta < 0 ? "err" : "muted";
              const sign = delta > 0 ? "+" : "";
              return (
                <div
                  key={r.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: "1px solid var(--w-line)",
                  }}
                >
                  <p
                    style={{
                      flex: 1,
                      color: "var(--w-fg)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.name}
                  </p>
                  <div
                    className="w-type-meta"
                    style={{
                      width: 80,
                      textAlign: "right",
                      flexShrink: 0,
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {r.a} / {r.b}
                  </div>
                  <div
                    className="w-type-meta"
                    style={{
                      width: 60,
                      textAlign: "right",
                      flexShrink: 0,
                      color: diffTone(tone),
                      fontFamily: "var(--w-mono)",
                    }}
                  >
                    {sign}
                    {delta}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div
        className="w-type-meta"
        style={{ color: "var(--w-fg-dim)" }}
      >
        OPEN RECAP FOR{" "}
        <Link
          href={`/owner/events/${aId}/recap`}
          style={{ color: "var(--w-acc)", textDecoration: "none" }}
        >
          A
        </Link>{" "}
        ·{" "}
        <Link
          href={`/owner/events/${bId}/recap`}
          style={{ color: "var(--w-acc)", textDecoration: "none" }}
        >
          B
        </Link>
      </div>
    </div>
  );
}

function DiffKPI({
  label,
  a,
  b,
  diff,
}: {
  label: string;
  a: number | string;
  b: number | string;
  diff: { label: string; tone: DiffTone };
}) {
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        background: "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
          marginTop: 8,
          color: "var(--w-fg)",
        }}
      >
        {a}{" "}
        <span
          style={{
            color: "var(--w-fg-muted)",
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          vs
        </span>{" "}
        {b}
      </div>
      <div
        className="w-type-meta"
        style={{ marginTop: 8, color: diffTone(diff.tone) }}
      >
        {diff.label}
      </div>
    </div>
  );
}
