import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

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
        "night:event_nights!inner(event:events!inner(id, name, account_id))"
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
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name)"
    )
    .eq("entity_type", "guest")
    .eq("entity_id", params.guestId)
    .in("action", ["guest.tier_upgraded", "guest.rsvp", "guest.flag_dna", "guest.unflag_dna", "guest.merge"])
    .order("created_at", { ascending: false });
  const rows = (rowsRaw ?? []) as unknown as AuditRow[];

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link
          href={`/owner/events/${params.id}/guests/${params.guestId}`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">History</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-1">{guest.full_name}</h1>
      <p className="label-mono mb-4">
        {guest.night.event.name} · current tier{" "}
        <span className="text-cream">{tierLabel(guest.tier)}</span>
      </p>

      <section className="card mb-4">
        <p className="label-mono mb-2">Snapshot</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-mono">RSVP&apos;d</p>
            <p className="font-sans text-cream">{fmtDate(guest.created_at)}</p>
          </div>
          <div>
            <p className="label-mono">Last upgrade</p>
            <p className="font-sans text-cream">
              {guest.tier_upgraded_at ? fmtDate(guest.tier_upgraded_at) : "—"}
            </p>
          </div>
        </div>
      </section>

      <p className="label-mono mb-2">Timeline</p>
      {rows.length === 0 ? (
        <EmptyState
          title="No history yet"
          body="Tier changes, flags, and merges will show up here as they happen."
        />
      ) : (
        <ul className="flex flex-col gap-2">
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
            const tone =
              action === "guest.tier_upgraded"
                ? "border-mint/40"
                : action === "guest.flag_dna"
                ? "border-coral/40"
                : "border-line";
            return (
              <li key={r.id} className={`card ${tone}`}>
                <p className="font-sans text-cream text-sm">{line}</p>
                <p className="label-mono mt-1">
                  {new Date(r.created_at).toLocaleString()} · {actor}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
