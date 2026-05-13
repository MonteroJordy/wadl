import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import { getAppUrl } from "@/lib/app-url";
import { Chip } from "@/components/wadl";
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
            href={`/owner/events/${event.id}/allocations`}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta">ALLOCATION</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{alloc.holder_name}</div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {event.name.toUpperCase()} ·{" "}
            {fmtDate(night.night_date).toUpperCase()}
          </p>
          <p className="w-type-meta" style={{ marginTop: 6 }}>
            <span style={{ color: "var(--w-fg)" }}>{used}</span>/{alloc.cap}{" "}
            USED
          </p>
        </div>

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

        <div style={{ marginTop: 32 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            GUESTS ON THIS LIST
          </div>
          {guestsList.length === 0 ? (
            <p
              className="w-type-meta"
              style={{ textAlign: "center", color: "var(--w-ok)" }}
            >
              NONE YET — SHARE THE MAGIC LINK AND NAMES WILL LAND HERE.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {guestsList.map((g) => (
                <Link
                  key={g.id}
                  href={`/owner/events/${event.id}/guests/${g.id}`}
                  className="w-card"
                  style={{
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        color: "var(--w-fg)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {g.full_name}
                    </p>
                    {g.plus_ones > 0 && (
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        +{g.plus_ones}
                      </div>
                    )}
                  </div>
                  <Chip tone={STATUS_TONE[g.status] ?? "ghost"}>
                    {g.status.toUpperCase()}
                  </Chip>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
