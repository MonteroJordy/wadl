import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Chip } from "@/components/wadl";
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
    recent: "MOST RECENT",
    name: "BY NAME",
    event: "BY EVENT",
  };

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
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">DO NOT ADMIT · DNA</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Blocked guests
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            {items.length} blocked guest{items.length === 1 ? "" : "s"} across
            this account · the door scanner rejects these on sight.
          </p>
        </div>

        {items.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">Clean sheet</div>
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
              No DNA flags across any of your events. Flag a guest from their
              detail page when needed.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                paddingBottom: 4,
                marginBottom: 16,
              }}
            >
              {(["recent", "name", "event"] as const).map((s) => (
                <a
                  key={s}
                  href={
                    s === "recent" ? "/owner/flags" : `/owner/flags?sort=${s}`
                  }
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <Chip tone={sort === s ? "acc" : "ghost"}>
                    {sortLabels[s]}
                  </Chip>
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
