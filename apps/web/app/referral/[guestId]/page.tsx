import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Logo } from "@/components/v5";
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
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
          <Logo size={18} />
        </div>
        <div
          style={{
            padding: "var(--s-24) var(--s-6) 0",
            textAlign: "center",
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          <div className="t-meta">Referral</div>
          <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
            Link not found.
          </div>
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
  const capPct =
    alloc && alloc.cap > 0
      ? Math.min(100, Math.round((used / alloc.cap) * 100))
      : 0;

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <span className="chip chip--solid">Bring a friend</span>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <div className="t-meta">
          {fmtDate(ref.night.night_date)} · Doors{" "}
          {fmtTime(ref.night.doors_at)}
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          {ref.night.event.name}
        </div>
      </div>

      {ref.night.event.flyer_url ? (
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 5",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line)",
              background: "var(--bg-3)",
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

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div className="card" style={{ padding: "var(--s-5)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-3)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-meta">Referral by</div>
              <div className="t-h1" style={{ marginTop: "var(--s-1)" }}>
                {ref.full_name}
              </div>
            </div>
            {(brought ?? 0) > 0 && (
              <span className="chip chip--ok">{brought} brought</span>
            )}
          </div>
          {alloc && alloc.cap > 0 && (
            <>
              <div
                style={{
                  marginTop: "var(--s-4)",
                  height: 4,
                  background: "var(--line)",
                  borderRadius: "var(--r-pill)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${capPct}%`,
                    background: "var(--fg)",
                  }}
                />
              </div>
              <div
                className="t-meta"
                style={{ marginTop: "var(--s-2)" }}
              >
                {remaining} spots left
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <ReferralForm
          guestId={ref.id}
          plusOnesAllowed={alloc?.plus_ones_allowed ?? false}
          active={active}
        />
      </div>

      <div
        style={{
          paddingTop: "var(--s-8)",
          paddingBottom: "var(--s-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--s-2)",
        }}
      >
        <span className="t-meta">Powered by</span>
        <Logo size={11} />
      </div>
    </main>
  );
}
