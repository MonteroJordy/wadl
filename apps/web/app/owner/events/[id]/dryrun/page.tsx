import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import DryRunControls from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dry run — WADL" };

export default async function DryRunPage({
  params,
}: {
  params: { id: string };
}) {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, name, account_id, event_nights(id, capacity_cap)")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account_id: string;
      event_nights: Array<{ id: string; capacity_cap: number | null }>;
    }>();
  if (!event || event.account_id !== account.id) notFound();

  const nightIds = event.event_nights.map((n) => n.id);
  const totalCap = event.event_nights.reduce(
    (s, n) => s + (n.capacity_cap ?? 0),
    0
  );

  // How many DRYRUN guests already exist on this event.
  let existingCount = 0;
  if (nightIds.length > 0) {
    const { count } = await admin
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("notes", "DRYRUN")
      .in("event_night_id", nightIds);
    existingCount = count ?? 0;
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 md:px-8 pt-6 pb-16"
    >
      <header className="mb-8">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream transition mb-2 inline-block"
        >
          ← {event.name}
        </Link>
        <h1 className="font-display text-4xl md:text-5xl text-cream uppercase tracking-wide leading-[0.9]">
          Dry run
        </h1>
        <p className="text-cream/70 text-sm leading-relaxed mt-3 max-w-2xl">
          Stress-test the daydash, queue, recap, and SMS log without burning a
          real Friday. Seeds DRYRUN-flagged guests with realistic distribution
          (mix of approved + pending + waitlisted, plus-ones, tier mix). Optional
          check-in simulation jitters scans across the 2h after doors so the
          arrival-velocity chart populates.
        </p>
      </header>

      <section className="card mb-4">
        <p className="label-mono mb-2">Current state</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="font-display text-3xl text-cream leading-none">
              {existingCount}
            </p>
            <p className="label-mono mt-1">DRYRUN guests</p>
          </div>
          <div>
            <p className="font-display text-3xl text-cream leading-none">
              {event.event_nights.length}
            </p>
            <p className="label-mono mt-1">
              Night{event.event_nights.length === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl text-cream leading-none">
              {totalCap || "—"}
            </p>
            <p className="label-mono mt-1">Total cap</p>
          </div>
        </div>
      </section>

      <DryRunControls eventId={event.id} existingCount={existingCount} />

      <section className="card mt-4">
        <p className="label-mono mb-2">What this populates</p>
        <ul className="text-cream/80 text-sm leading-relaxed space-y-2">
          <li>
            · <span className="text-coral">Daydash hero stats</span> — In/Pending/RSVPs counters move with realistic numbers.
          </li>
          <li>
            · <span className="text-coral">Capacity ETA</span> — recent-30-minute scan rate becomes nonzero, the projected-at-cap pill activates.
          </li>
          <li>
            · <span className="text-coral">Approval queue</span> — the pending bucket has things to approve.
          </li>
          <li>
            · <span className="text-coral">Top holders</span> — if you have allocations, simulated guests roll up to them.
          </li>
          <li>
            · <span className="text-coral">Recap</span> — show rate, tier breakdown, top-holder ranking all populate.
          </li>
          <li>
            · <span className="text-coral">Hour velocity chart</span> — arrival distribution renders properly.
          </li>
        </ul>
      </section>

      <section className="card mt-4 border-coral/40 bg-s2">
        <p className="label-mono text-coral mb-2">What it doesn&apos;t do</p>
        <ul className="text-cream/80 text-sm leading-relaxed space-y-2">
          <li>· No real SMS goes out — phones are +1555 placeholder numbers.</li>
          <li>· No webhooks fire to integrations.</li>
          <li>· No notifications get pushed (the Supabase Realtime bell stays quiet).</li>
          <li>
            · Cleanup deletes every guest tagged{" "}
            <code className="text-coral">notes = &quot;DRYRUN&quot;</code> on this event&apos;s nights — leaves real guests intact.
          </li>
        </ul>
      </section>
    </main>
  );
}
