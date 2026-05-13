import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { fmtDate } from "@/lib/format";
import CsvImportForm from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportCsvPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, event_nights(id, night_date, doors_at, allocations(id, holder_name))",
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{
        id: string;
        night_date: string;
        doors_at: string;
        allocations: Array<{ id: string; holder_name: string }>;
      }>;
    }>();
  if (!event) notFound();

  const nights = [...event.event_nights]
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))
    .map((n) => ({ id: n.id, label: fmtDate(n.night_date) }));

  const allocations: Array<{ id: string; night_id: string; label: string }> =
    [];
  for (const n of event.event_nights) {
    for (const a of n.allocations ?? []) {
      allocations.push({
        id: a.id,
        night_id: n.id,
        label: `${a.holder_name} (${fmtDate(n.night_date)})`,
      });
    }
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
          ← BACK
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">IMPORT</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Import CSV
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Bulk-add guests to {event.name}. Phones validated to E.164.
            Duplicates by phone skipped.
          </p>
        </div>

        <CsvImportForm
          eventId={event.id}
          nights={nights}
          allocations={allocations}
        />
      </div>
    </main>
  );
}
