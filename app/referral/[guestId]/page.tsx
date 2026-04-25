import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import ReferralForm from "./form";

export const dynamic = "force-dynamic";

interface ReferrerData {
  id: string;
  full_name: string;
  status: string;
  allocation_id: string | null;
  allocation: {
    id: string;
    cap: number;
    list_open: boolean;
    plus_ones_allowed: boolean;
  } | null;
  night: {
    id: string;
    night_date: string;
    doors_at: string;
    is_frozen: boolean;
    event: { id: string; name: string; flyer_url: string | null };
  };
}

export default async function ReferralPage({
  params,
}: {
  params: { guestId: string };
}) {
  const admin = createAdminClient();

  const { data: ref } = await admin
    .from("guests")
    .select(
      "id, full_name, status, allocation_id, " +
        "allocation:allocations(id, cap, list_open, plus_ones_allowed), " +
        "night:event_nights!inner(id, night_date, doors_at, is_frozen, event:events!inner(id, name, flyer_url))"
    )
    .eq("id", params.guestId)
    .maybeSingle<ReferrerData>();

  if (!ref) {
    return (
      <main className="mobile-frame">
        <div className="pt-12 text-center">
          <p className="label-mono mb-3">WADL</p>
          <h1 className="display-lg mb-3">Link not found.</h1>
        </div>
      </main>
    );
  }

  // Count brought-by-this-referrer guests so they see their tally.
  const { count: brought } = await admin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("referred_by_guest_id", ref.id);

  const alloc = ref.allocation;
  let used = 0;
  if (alloc) {
    const { data: g } = await admin
      .from("guests")
      .select("plus_ones, status")
      .eq("allocation_id", alloc.id)
      .in("status", ["approved", "pending"]);
    used = (g ?? []).reduce((s, x) => s + 1 + (x.plus_ones ?? 0), 0);
  }
  const remaining = alloc ? Math.max(0, alloc.cap - used) : 0;
  const active =
    !!alloc &&
    alloc.list_open &&
    !ref.night.is_frozen &&
    remaining > 0 &&
    ref.status !== "cancelled" &&
    ref.status !== "rejected";

  return (
    <main className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono mb-2">Bring a friend</p>
        <h1 className="display-lg">{ref.night.event.name}</h1>
        <p className="label-mono mt-2">
          {fmtDate(ref.night.night_date)} · Doors {fmtTime(ref.night.doors_at)}
        </p>
      </header>

      {ref.night.event.flyer_url ? (
        <div
          className="w-full rounded-lg overflow-hidden mb-4 border border-line"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ref.night.event.flyer_url}
            alt={ref.night.event.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <section className="card mb-5">
        <p className="label-mono mb-1">Referral by</p>
        <p className="font-sans text-cream font-semibold">{ref.full_name}</p>
        {(brought ?? 0) > 0 && (
          <p className="label-mono mt-2">
            <span className="text-mint">{brought}</span> brought so far
          </p>
        )}
        {alloc && (
          <p className="label-mono mt-2">
            {used}/{alloc.cap} on list ({remaining} spots left)
          </p>
        )}
      </section>

      <ReferralForm
        guestId={ref.id}
        plusOnesAllowed={alloc?.plus_ones_allowed ?? false}
        active={active}
      />

      <p className="label-mono mt-auto pt-8 text-center">Powered by WADL</p>
    </main>
  );
}
