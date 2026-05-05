import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  Avatar,
  CapacityMeter,
  Chip,
  WFrame,
  Wordmark,
} from "@/components/wadl";
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
        "night:event_nights!inner(id, night_date, doors_at, is_frozen, event:events!inner(id, name, flyer_url))",
    )
    .eq("id", params.guestId)
    .maybeSingle<ReferrerData>();

  if (!ref) {
    return (
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div style={{ padding: "20px 24px 0" }}>
            <Wordmark variant="monogrid" size={18} />
          </div>
          <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
            <div className="w-type-meta">REFERRAL</div>
            <div className="w-type-display-md" style={{ marginTop: 12 }}>
              Link not found.
            </div>
          </div>
        </WFrame>
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
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark variant="monogrid" size={18} />
          <Chip tone="acc">BRING A FRIEND</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">
            {fmtDate(ref.night.night_date).toUpperCase()} · DOORS{" "}
            {fmtTime(ref.night.doors_at).toUpperCase()}
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            {ref.night.event.name}
          </div>
        </div>

        {ref.night.event.flyer_url ? (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                border: "1px solid var(--w-line)",
                background: "var(--w-surface-2)",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ref.night.event.flyer_url}
                alt={ref.night.event.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        ) : null}

        <div style={{ padding: "24px 24px 0" }}>
          <div className="w-card" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Avatar name={ref.full_name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="w-type-meta">REFERRAL BY</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 17,
                    marginTop: 2,
                  }}
                >
                  {ref.full_name}
                </div>
              </div>
              {(brought ?? 0) > 0 && (
                <Chip tone="ok">{brought} BROUGHT</Chip>
              )}
            </div>
            {alloc && alloc.cap > 0 && (
              <div style={{ marginTop: 8 }}>
                <CapacityMeter
                  current={used}
                  total={alloc.cap}
                  accent
                  label={`${remaining} SPOTS LEFT`}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <ReferralForm
            guestId={ref.id}
            plusOnesAllowed={alloc?.plus_ones_allowed ?? false}
            active={active}
          />
        </div>

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 32,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          POWERED BY <Wordmark variant="slash" size={11} />
        </div>
      </WFrame>
    </main>
  );
}
