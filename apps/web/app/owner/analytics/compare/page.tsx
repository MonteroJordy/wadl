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
        title="Need 2+ events"
        body="Compare unlocks once you've run two events with check-ins."
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
