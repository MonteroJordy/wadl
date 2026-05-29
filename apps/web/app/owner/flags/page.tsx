import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/v5";
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

  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, flag_reason, phone, created_at, night:event_nights!inner(night_date, event:events!inner(id, name, account_id))",
    )
    .eq("flag_dna", true);
  const all = (
    (data ?? []) as unknown as Array<FlagRow & { created_at: string }>
  ).filter((r) => r.night.event.account_id === account.id);

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

  const sortLabels: Record<typeof sort, string> = {
    recent: "Most recent",
    name: "By name",
    event: "By event",
  };

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PageHeader
        eyebrow="Guests · blocklist"
        title={`Blocklist · ${items.length} active`}
        sub="Private to this account · the door scanner rejects these on sight."
      />

      <div style={{ padding: "var(--s-8)" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "var(--s-20) var(--s-8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--r-lg)",
                background: "var(--bg-3)",
                marginBottom: "var(--s-5)",
              }}
            />
            <div className="t-display-md">Clean sheet</div>
            <div
              className="t-body-2"
              style={{ marginTop: "var(--s-3)", maxWidth: 380 }}
            >
              No DNA flags across any of your events. Flag a guest from their
              detail page when needed.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: "var(--s-1)",
                marginBottom: "var(--s-4)",
                flexWrap: "wrap",
              }}
            >
              {(["recent", "name", "event"] as const).map((s) => (
                <a
                  key={s}
                  href={
                    s === "recent" ? "/owner/flags" : `/owner/flags?sort=${s}`
                  }
                  className={
                    "nav-item " + (sort === s ? "nav-item--active" : "")
                  }
                  style={{
                    textDecoration: "none",
                    fontSize: "var(--ts-sm)",
                  }}
                >
                  {sortLabels[s]}
                </a>
              ))}
            </div>
            <BulkFlagForm items={items} />
          </>
        )}
      </div>
    </main>
  );
}
