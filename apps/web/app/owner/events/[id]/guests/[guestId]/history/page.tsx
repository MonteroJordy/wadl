import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tier history — WADL" };

interface AuditRow {
  id: string;
  action: string;
  context: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
}

const TIER_LABEL: Record<string, string> = {
  ga: "GA",
  vip: "VIP",
  all_access: "All access",
};

function tierLabel(t?: string) {
  return TIER_LABEL[t ?? ""] ?? (t ?? "—");
}

export default async function GuestHistoryPage({
  params,
}: {
  params: { id: string; guestId: string };
}) {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, tier, status, created_at, tier_upgraded_at, " +
        "night:event_nights!inner(event:events!inner(id, name, account_id))",
    )
    .eq("id", params.guestId)
    .maybeSingle<{
      id: string;
      full_name: string;
      tier: string;
      status: string;
      created_at: string;
      tier_upgraded_at: string | null;
      night: { event: { id: string; name: string; account_id: string } };
    }>();

  if (!guest || guest.night.event.account_id !== account.id) notFound();
  if (guest.night.event.id !== params.id) notFound();

  const { data: rowsRaw } = await admin
    .from("audit_log")
    .select(
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name)",
    )
    .eq("entity_type", "guest")
    .eq("entity_id", params.guestId)
    .in("action", [
      "guest.tier_upgraded",
      "guest.rsvp",
      "guest.flag_dna",
      "guest.unflag_dna",
      "guest.merge",
    ])
    .order("created_at", { ascending: false });
  const rows = (rowsRaw ?? []) as unknown as AuditRow[];

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [guest.night.event.name, `/owner/events/${params.id}`],
          [
            guest.full_name,
            `/owner/events/${params.id}/guests/${params.guestId}`,
          ],
          "History",
        ]}
      />
      <PageHeader
        eyebrow={`History · current tier ${tierLabel(guest.tier)}`}
        title={guest.full_name}
        sub="Tier changes, flags, and merges over time."
      />
      <EventSubNav active="guests" eventId={params.id} />

      <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
        <section
          className="card"
          style={{ padding: "var(--s-5)", marginBottom: "var(--s-4)" }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Snapshot
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <div className="t-meta">RSVP&apos;d</div>
              <div className="t-body" style={{ marginTop: "var(--s-1)" }}>
                {fmtDate(guest.created_at)}
              </div>
            </div>
            <div>
              <div className="t-meta">Last upgrade</div>
              <div className="t-body" style={{ marginTop: "var(--s-1)" }}>
                {guest.tier_upgraded_at
                  ? fmtDate(guest.tier_upgraded_at)
                  : "—"}
              </div>
            </div>
          </div>
        </section>

        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          Timeline
        </div>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-12) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-h1">No history yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Tier changes, flags, and merges will show up here as they happen.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {rows.map((r) => {
              const ctx = r.context ?? {};
              const action = r.action;
              const actor = r.actor?.full_name ?? "system";
              let line = action.replace(/_/g, " ");
              if (action === "guest.tier_upgraded") {
                const from = ctx.from as string | undefined;
                const to = ctx.to as string | undefined;
                line = `Tier upgraded${from ? ` ${tierLabel(from)} → ${tierLabel(to)}` : ""}`;
              } else if (action === "guest.rsvp") {
                line = `RSVP submitted${ctx.status ? ` (${ctx.status})` : ""}`;
              } else if (action === "guest.flag_dna") {
                line = `Flagged Do Not Admit${ctx.reason ? `: ${ctx.reason}` : ""}`;
              } else if (action === "guest.unflag_dna") {
                line = "Flag removed";
              } else if (action === "guest.merge") {
                line = "Merged from duplicate record";
              }
              const borderColor =
                action === "guest.tier_upgraded"
                  ? "var(--ok)"
                  : action === "guest.flag_dna"
                    ? "var(--err)"
                    : "var(--line)";
              return (
                <div
                  key={r.id}
                  className="card"
                  style={{ padding: "var(--s-4)", borderColor }}
                >
                  <div className="t-body">{line}</div>
                  <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                    {new Date(r.created_at).toLocaleString()} · {actor}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
