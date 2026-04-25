import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";
import BulkFlagForm from "./bulk-form";

export const dynamic = "force-dynamic";

interface FlagRow {
  id: string;
  full_name: string;
  flag_reason: string | null;
  phone: string | null;
  night: {
    night_date: string;
    event: { id: string; name: string; account_id: string };
  };
}

export default async function MasterFlagsPage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  const { account } = await requireOwnerContext();
  const sort = (searchParams.sort ?? "recent") as "recent" | "name" | "event";
  const admin = createAdminClient();

  // Pull all flagged guests across this account's events.
  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, flag_reason, phone, created_at, night:event_nights!inner(night_date, event:events!inner(id, name, account_id))"
    )
    .eq("flag_dna", true);
  const all = ((data ?? []) as unknown as Array<FlagRow & { created_at: string }>).filter(
    (r) => r.night.event.account_id === account.id
  );

  if (sort === "name") all.sort((a, b) => a.full_name.localeCompare(b.full_name));
  else if (sort === "event")
    all.sort((a, b) => a.night.event.name.localeCompare(b.night.event.name));
  else all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const items = all.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    reason: r.flag_reason,
    event_name: r.night.event.name,
    night_date: fmtDate(r.night.night_date),
    phone: r.phone,
  }));

  return (
    <main className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <header className="mb-6">
        <p className="label-mono mb-1">DNA registry</p>
        <h1 className="display-lg">Flag list</h1>
        <p className="label-mono mt-2">
          {items.length} flagged guest{items.length === 1 ? "" : "s"} across this account
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Clean sheet"
          body="No DNA flags across any of your events. Flag a guest from their detail page when needed."
        />
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
            {(["recent", "name", "event"] as const).map((s) => (
              <a
                key={s}
                href={s === "recent" ? "/owner/flags" : `/owner/flags?sort=${s}`}
                className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                  sort === s
                    ? "border-coral bg-s2 text-cream"
                    : "border-line bg-s1 text-muted hover:text-cream"
                }`}
              >
                {s === "recent" ? "Most recent" : s === "name" ? "By name" : "By event"}
              </a>
            ))}
          </div>
          <BulkFlagForm items={items} />
        </>
      )}
    </main>
  );
}
