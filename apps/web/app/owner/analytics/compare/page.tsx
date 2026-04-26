import Link from "next/link";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRecap } from "@/lib/recap";
import EmptyState from "@/components/empty-state";
import ComparePicker from "./picker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare events — WADL" };

interface EventLite {
  id: string;
  name: string;
  doors: string;
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
  const events: EventLite[] = ((evRaw ?? []) as Array<{
    id: string;
    name: string;
    event_nights: Array<{ doors_at: string }>;
  }>)
    .map((e) => ({
      id: e.id,
      name: e.name,
      doors: e.event_nights.sort((x, y) =>
        x.doors_at < y.doors_at ? -1 : 1
      )[0]?.doors_at ?? "",
    }))
    .filter((e) => e.doors)
    .sort((x, y) => (x.doors < y.doors ? 1 : -1));

  if (events.length < 2) {
    return (
      <EmptyState
        title="Need a second night"
        body="Two nights with check-ins unlock side-by-side. Pace this Friday vs. last; promoter-by-promoter deltas; what changed and why."
      />
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

  function diffPct(a: number, b: number): { label: string; tone: string } {
    if (b === 0) return { label: "—", tone: "text-muted" };
    const pct = ((a - b) / b) * 100;
    const sign = pct > 0 ? "+" : "";
    const tone = pct > 0 ? "text-mint" : pct < 0 ? "text-coral" : "text-muted";
    return { label: `${sign}${Math.round(pct)}%`, tone };
  }

  const showA = recapA.showRate;
  const showB = recapB.showRate;
  const showDiff = diffPct(showA, showB);
  const scannedDiff = diffPct(recapA.totalCheckedIn, recapB.totalCheckedIn);
  const approvedDiff = diffPct(recapA.totalApproved, recapB.totalApproved);

  return (
    <div className="flex flex-col gap-3">
      <section className="grid md:grid-cols-2 gap-3">
        <div className="card">
          <p className="label-mono mb-2">Event A</p>
          <ComparePicker side="a" events={events} current={aId} />
          {evA && (
            <p className="font-sans text-cream mt-3 truncate">{evA.name}</p>
          )}
        </div>
        <div className="card">
          <p className="label-mono mb-2">Event B</p>
          <ComparePicker side="b" events={events} current={bId} />
          {evB && (
            <p className="font-sans text-cream mt-3 truncate">{evB.name}</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="card">
          <p className="label-mono">Show rate</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {Math.round(showA * 100)}%{" "}
            <span className="text-muted text-base">vs</span>{" "}
            {Math.round(showB * 100)}%
          </p>
          <p className={`label-mono mt-1 ${showDiff.tone}`}>{showDiff.label}</p>
        </div>
        <div className="card">
          <p className="label-mono">Scanned</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {recapA.totalCheckedIn}{" "}
            <span className="text-muted text-base">vs</span> {recapB.totalCheckedIn}
          </p>
          <p className={`label-mono mt-1 ${scannedDiff.tone}`}>
            {scannedDiff.label}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Approved</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {recapA.totalApproved}{" "}
            <span className="text-muted text-base">vs</span> {recapB.totalApproved}
          </p>
          <p className={`label-mono mt-1 ${approvedDiff.tone}`}>
            {approvedDiff.label}
          </p>
        </div>
      </section>

      <section className="card">
        <p className="label-mono mb-3">By tier · approved &amp; show rate</p>
        {(() => {
          // Union of tier keys across both recaps so missing rows render as 0.
          const tierKeys = Array.from(
            new Set([
              ...recapA.tiers.map((t) => t.tier),
              ...recapB.tiers.map((t) => t.tier),
            ])
          );
          if (tierKeys.length === 0) {
            return (
              <p className="text-muted text-sm">
                No tier data on either event yet.
              </p>
            );
          }
          return (
            <div className="flex flex-col gap-2">
              {tierKeys.map((tier) => {
                const a = recapA.tiers.find((t) => t.tier === tier);
                const b = recapB.tiers.find((t) => t.tier === tier);
                const aApproved = a?.approved ?? 0;
                const bApproved = b?.approved ?? 0;
                const aShow = a?.showRate ?? 0;
                const bShow = b?.showRate ?? 0;
                const apprDiff = diffPct(aApproved, bApproved);
                const showDiffT = {
                  label:
                    bShow === 0
                      ? "—"
                      : `${aShow > bShow ? "+" : ""}${Math.round((aShow - bShow) * 100)}pt`,
                  tone:
                    aShow > bShow
                      ? "text-mint"
                      : aShow < bShow
                      ? "text-coral"
                      : "text-muted",
                };
                return (
                  <div
                    key={tier}
                    className="flex items-center justify-between gap-3 border-b border-line/40 pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="label-mono uppercase tracking-wider w-20 shrink-0">
                      {tier}
                    </p>
                    <div className="flex-1 grid grid-cols-2 gap-3 text-right">
                      <div>
                        <p className="font-sans text-cream text-sm">
                          {aApproved} <span className="text-muted">approved</span>
                        </p>
                        <p className="label-mono">
                          {Math.round(aShow * 100)}% show
                        </p>
                      </div>
                      <div>
                        <p className="font-sans text-cream text-sm">
                          {bApproved} <span className="text-muted">approved</span>
                        </p>
                        <p className="label-mono">
                          {Math.round(bShow * 100)}% show
                        </p>
                      </div>
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <p className={`label-mono ${apprDiff.tone}`}>{apprDiff.label}</p>
                      <p className={`label-mono ${showDiffT.tone}`}>{showDiffT.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      <section className="card">
        <p className="label-mono mb-3">Top holders · scanned heads</p>
        {(() => {
          // Union holders by name (allocations may differ across events).
          const holderKeys = Array.from(
            new Set([
              ...recapA.topHolders.map((h) => h.holder_name),
              ...recapB.topHolders.map((h) => h.holder_name),
            ])
          );
          // Rank by combined scan delta magnitude — show top 8.
          const rows = holderKeys
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
          if (rows.length === 0) {
            return (
              <p className="text-muted text-sm">
                No holder activity to compare.
              </p>
            );
          }
          return (
            <div className="flex flex-col gap-2">
              {rows.map((r) => {
                const delta = r.a - r.b;
                const tone =
                  delta > 0
                    ? "text-mint"
                    : delta < 0
                    ? "text-coral"
                    : "text-muted";
                const sign = delta > 0 ? "+" : "";
                return (
                  <div
                    key={r.name}
                    className="flex items-center justify-between gap-3 border-b border-line/40 pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="font-sans text-cream truncate flex-1">
                      {r.name}
                    </p>
                    <p className="label-mono w-16 text-right shrink-0">
                      {r.a} / {r.b}
                    </p>
                    <p className={`label-mono w-12 text-right shrink-0 ${tone}`}>
                      {sign}
                      {delta}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      <p className="label-mono">
        Open recap for{" "}
        <Link
          href={`/owner/events/${aId}/recap`}
          className="text-coral hover:text-cream"
        >
          A
        </Link>{" "}
        ·{" "}
        <Link
          href={`/owner/events/${bId}/recap`}
          className="text-coral hover:text-cream"
        >
          B
        </Link>
      </p>
    </div>
  );
}
