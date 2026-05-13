import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { Chip } from "@/components/wadl";
import QueueRow from "./row";
import BulkActions from "./bulk";

export const dynamic = "force-dynamic";

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

export default async function QueuePage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id, event_nights(id, night_date, doors_at)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = (
    (event.event_nights ?? []) as Array<{
      id: string;
      night_date: string;
      doors_at: string;
    }>
  ).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  const nightIds = nights.map((n) => n.id);

  let pending: Array<{
    id: string;
    event_night_id: string;
    allocation_id: string | null;
    full_name: string;
    plus_ones: number;
    created_at: string;
  }> = [];
  let allocs: Array<{ id: string; holder_name: string }> = [];
  if (nightIds.length > 0) {
    const [pRes, aRes] = await Promise.all([
      supabase
        .from("guests")
        .select(
          "id, event_night_id, allocation_id, full_name, plus_ones, created_at",
        )
        .in("event_night_id", nightIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("allocations")
        .select("id, holder_name")
        .in("event_night_id", nightIds),
    ]);
    pending = (pRes.data ?? []) as typeof pending;
    allocs = (aRes.data ?? []) as typeof allocs;
  }

  const holderById = new Map(allocs.map((a) => [a.id, a.holder_name]));
  const byNight = new Map<string, typeof pending>();
  for (const g of pending) {
    if (!byNight.has(g.event_night_id)) byNight.set(g.event_night_id, []);
    byNight.get(g.event_night_id)!.push(g);
  }

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
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          ← {event.name.toUpperCase()}
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginTop: 16,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">APPROVAL QUEUE</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Pending review
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {pending.length === 0
                ? "Nothing pending — auto-approved allocations bypass this view."
                : `${pending.length} pending · approve or reject below.`}
            </p>
          </div>
          {pending.length > 0 && (
            <Chip tone="warn">{pending.length} PENDING</Chip>
          )}
        </div>

        {pending.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "oklch(0.86 0.18 145 / 0.18)",
                color: "var(--w-ok)",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <div className="w-type-h1">Queue empty</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 420,
                marginInline: "auto",
              }}
            >
              Nothing waiting for review. Auto-approved allocations bypass
              this view — you only see RSVPs from holders who require host
              approval.
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            {nights.map((n) => {
              const list = byNight.get(n.id) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={n.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span className="w-type-meta">
                      {fmtDate(n.night_date).toUpperCase()} · {list.length}{" "}
                      PENDING
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <BulkActions
                      eventId={event.id}
                      nightId={n.id}
                      count={list.length}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {list.map((g) => (
                      <QueueRow
                        key={g.id}
                        eventId={event.id}
                        guestId={g.id}
                        fullName={g.full_name}
                        plusOnes={g.plus_ones}
                        holderLabel={
                          g.allocation_id
                            ? (holderById.get(g.allocation_id) ?? "Holder")
                            : "Direct add"
                        }
                        addedAgo={ago(g.created_at)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
