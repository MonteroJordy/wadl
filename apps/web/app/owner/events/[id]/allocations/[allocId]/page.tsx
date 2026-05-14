import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { getAppUrl } from "@/lib/app-url";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import AllocationControls from "./controls";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "ok" | "warn" | "err" | "ghost"> = {
  approved: "ok",
  pending: "warn",
  rejected: "err",
};

export default async function AllocationDetailPage({
  params,
}: {
  params: { id: string; allocId: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const { data: alloc } = await supabase
    .from("allocations")
    .select(
      "id, event_night_id, holder_name, holder_phone, holder_email, cap, auto_approve, list_open, plus_ones_allowed, event_nights(night_date, doors_at, event_id)",
    )
    .eq("id", params.allocId)
    .maybeSingle();
  if (
    !alloc ||
    (alloc.event_nights as unknown as { event_id: string }).event_id !==
      event.id
  ) {
    notFound();
  }

  const night = alloc.event_nights as unknown as {
    night_date: string;
    doors_at: string;
    event_id: string;
  };

  const { data: tokenRow } = await supabase
    .from("allocation_tokens")
    .select("token, created_at")
    .eq("allocation_id", alloc.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ token: string; created_at: string }>();

  const holderUrl = tokenRow ? `${getAppUrl()}/h/${tokenRow.token}` : "";

  const { data: guests } = await supabase
    .from("guests")
    .select("id, full_name, plus_ones, status, created_at")
    .eq("allocation_id", alloc.id)
    .order("created_at", { ascending: false });

  const guestsList = (guests ?? []) as Array<{
    id: string;
    full_name: string;
    plus_ones: number;
    status: string;
    created_at: string;
  }>;

  const used = guestsList
    .filter((g) => g.status === "approved" || g.status === "pending")
    .reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          ["Allocations", `/owner/events/${event.id}/allocations`],
          alloc.holder_name,
        ]}
      />
      <PageHeader
        eyebrow={`${event.name} · ${fmtDate(night.night_date)}`}
        title={alloc.holder_name}
        sub={`${used} / ${alloc.cap} used`}
      />
      <EventSubNav active="guests" eventId={event.id} />

      <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
        <AllocationControls
          eventId={event.id}
          allocId={alloc.id}
          initial={{
            cap: alloc.cap,
            auto_approve: alloc.auto_approve,
            list_open: alloc.list_open,
            plus_ones_allowed: alloc.plus_ones_allowed,
          }}
          holderUrl={holderUrl}
        />

        <div style={{ marginTop: "var(--s-10)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Guests on this list
          </div>
          {guestsList.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--s-10)", textAlign: "center" }}
            >
              <div className="t-body-2">
                None yet — share the magic link and names will land here.
              </div>
            </div>
          ) : (
            <div className="card">
              {guestsList.map((g) => (
                <Link
                  key={g.id}
                  href={`/owner/events/${event.id}/guests/${g.id}`}
                  className="row"
                  style={{
                    gridTemplateColumns: "1fr 80px 120px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span className="t-h1 truncate">{g.full_name}</span>
                  <span className="t-meta">
                    {g.plus_ones > 0 ? `+${g.plus_ones}` : ""}
                  </span>
                  <span className={`chip chip--${STATUS_TONE[g.status] ?? "ghost"}`}>
                    {g.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
