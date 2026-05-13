import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import OverrideForm from "./override-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner override — WADL" };

export default async function OwnerOverridePage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_nights(id, night_date, doors_at, is_frozen)")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
        is_frozen: boolean;
      }>;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights]
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))
    .map((n) => ({
      id: n.id,
      label: fmtDate(n.night_date),
      is_frozen: n.is_frozen,
    }));

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
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← {event.name.toUpperCase()}
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">OVERRIDE</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Owner override
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Manually admit a guest. Bypasses caps + lockdown. Audit-logged.
          </p>
        </div>

        {nights.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            Add a night first.
          </p>
        ) : (
          <OverrideForm eventId={event.id} nights={nights} />
        )}
      </div>
    </main>
  );
}
