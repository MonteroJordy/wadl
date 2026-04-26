import Link from "next/link";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holders — WADL" };

interface HolderAgg {
  key: string;
  display_name: string;
  events: Set<string>;
  approved: number;
  scanned: number;
  cap_total: number;
  most_recent_at: string;
}

interface AllocRow {
  id: string;
  holder_name: string;
  holder_phone: string | null;
  holder_email: string | null;
  cap: number;
  event_night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; account_id: string };
  };
  guests: Array<{ status: string; plus_ones: number; check_ins: Array<{ state: string }> }>;
}

export default async function HoldersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { account } = await requireOwnerContext();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from("allocations")
    .select(
      "id, holder_name, holder_phone, holder_email, cap, " +
        "event_night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, account_id)), " +
        "guests(status, plus_ones, check_ins(state))"
    );
  const rows = ((rowsRaw ?? []) as unknown as AllocRow[]).filter(
    (r) => r.event_night.event.account_id === account.id
  );

  const byKey = new Map<string, HolderAgg & { phones: Set<string>; emails: Set<string> }>();
  for (const r of rows) {
    const key = r.holder_name.toLowerCase().trim();
    if (q && !key.includes(q)) continue;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        display_name: r.holder_name,
        events: new Set(),
        approved: 0,
        scanned: 0,
        cap_total: 0,
        most_recent_at: r.event_night.doors_at,
        phones: new Set(),
        emails: new Set(),
      });
    }
    const h = byKey.get(key)!;
    h.events.add(r.event_night.event.id);
    h.cap_total += r.cap;
    if (r.holder_phone) h.phones.add(r.holder_phone);
    if (r.holder_email) h.emails.add(r.holder_email);
    if (r.event_night.doors_at > h.most_recent_at)
      h.most_recent_at = r.event_night.doors_at;
    for (const g of r.guests ?? []) {
      if (g.status !== "approved") continue;
      const heads = 1 + (g.plus_ones ?? 0);
      h.approved += heads;
      if (g.check_ins.some((c) => c.state === "approved")) h.scanned += heads;
    }
  }

  const holders = [...byKey.values()].sort((a, b) =>
    a.most_recent_at < b.most_recent_at ? 1 : -1
  );

  return (
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <p className="label-mono mb-1">Holders</p>
        <h1 className="display-lg">All promoters + partners</h1>
        <p className="label-mono mt-2">
          {holders.length} unique holder{holders.length === 1 ? "" : "s"} across this account
        </p>
      </header>

      <form action="/owner/holders" method="get" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by holder name…"
          className="input-dark"
        />
      </form>

      {holders.length === 0 ? (
        <EmptyState
          title="No holders yet"
          body="Once you create allocations on an event, the holders will roll up here."
          action={
            <Link href="/owner" className="btn-ghost inline-block">
              Back to events
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {holders.map((h) => {
            const showRate = h.approved === 0 ? 0 : h.scanned / h.approved;
            return (
              <li key={h.key}>
                <Link
                  href={`/owner/scorecards/${encodeURIComponent(h.key)}`}
                  className="card flex items-start justify-between gap-3 hover:border-coral/60 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-cream font-semibold truncate">
                      {h.display_name}
                    </p>
                    <p className="label-mono mt-1">
                      {h.events.size} event{h.events.size === 1 ? "" : "s"} ·{" "}
                      cap {h.cap_total} · last {fmtDate(h.most_recent_at)}
                    </p>
                    {(h.phones.size > 0 || h.emails.size > 0) && (
                      <p className="label-mono mt-1 truncate">
                        {[...h.phones].slice(0, 1).join(" ")}
                        {h.phones.size > 0 && h.emails.size > 0 ? " · " : ""}
                        {[...h.emails].slice(0, 1).join(" ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-3xl text-cream leading-none">
                      {Math.round(showRate * 100)}%
                    </p>
                    <p className="label-mono mt-1">
                      <span className="text-mint">{h.scanned}</span>/{h.approved}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
