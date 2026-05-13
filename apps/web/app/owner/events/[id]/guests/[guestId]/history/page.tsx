import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

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
  return TIER_LABEL[t ?? ""] ?? (t ?? "—").toUpperCase();
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={`/owner/events/${params.id}/guests/${params.guestId}`}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta">HISTORY</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{guest.full_name}</div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {guest.night.event.name.toUpperCase()} · CURRENT TIER{" "}
            <span style={{ color: "var(--w-fg)" }}>
              {tierLabel(guest.tier)}
            </span>
          </p>
        </div>

        <section
          className="w-card"
          style={{ padding: 20, marginBottom: 16 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            SNAPSHOT
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <div className="w-type-meta">RSVP&apos;D</div>
              <p style={{ color: "var(--w-fg)", marginTop: 4 }}>
                {fmtDate(guest.created_at)}
              </p>
            </div>
            <div>
              <div className="w-type-meta">LAST UPGRADE</div>
              <p style={{ color: "var(--w-fg)", marginTop: 4 }}>
                {guest.tier_upgraded_at
                  ? fmtDate(guest.tier_upgraded_at)
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        <div className="w-type-meta" style={{ marginBottom: 8 }}>
          TIMELINE
        </div>
        {rows.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No history yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Tier changes, flags, and merges will show up here as they
              happen.
            </p>
          </div>
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              listStyle: "none",
              padding: 0,
              margin: 0,
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
                  ? "var(--w-ok)"
                  : action === "guest.flag_dna"
                    ? "var(--w-err)"
                    : "var(--w-line)";
              return (
                <li
                  key={r.id}
                  className="w-card"
                  style={{
                    padding: 14,
                    borderColor,
                  }}
                >
                  <p style={{ color: "var(--w-fg)", fontSize: 14 }}>{line}</p>
                  <div className="w-type-meta" style={{ marginTop: 4 }}>
                    {new Date(r.created_at).toLocaleString().toUpperCase()} ·{" "}
                    {actor.toUpperCase()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
