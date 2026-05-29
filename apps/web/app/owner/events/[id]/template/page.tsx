import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import TemplateForm from "./template-form";
import CreateFromTemplateButton from "./create-button";

export const dynamic = "force-dynamic";

interface TemplateRow {
  id: string;
  name: string;
  cadence_days: number | null;
  next_run_at: string | null;
  created_at: string;
  config: { source_name?: string };
}

export default async function TemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();
  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle<{ id: string; name: string }>();
  if (!event) notFound();

  const { data: tplsRaw } = await supabase
    .from("event_templates")
    .select("id, name, cadence_days, next_run_at, created_at, config")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });
  const tpls = (tplsRaw ?? []) as unknown as TemplateRow[];

  return (
    <main id="main-content">
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Lineup",
        ]}
      />
      <PageHeader
        eyebrow={`${tpls.length} template${
          tpls.length === 1 ? "" : "s"
        } · drag to reorder`}
        title="Lineup"
      />
      <EventSubNav active="lineup" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {/* New template form */}
        <div style={{ marginBottom: "var(--s-8)", maxWidth: 720 }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            New template from this event
          </div>
          <TemplateForm eventId={event.id} />
        </div>

        {/* All templates */}
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          All templates
        </div>
        {tpls.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-10)", textAlign: "center" }}
          >
            <div className="t-h1">No templates yet</div>
            <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              Save this event&apos;s shape above to reuse it later.
            </div>
          </div>
        ) : (
          <div className="card">
            {tpls.map((t) => (
              <div
                key={t.id}
                className="row"
                style={{
                  gridTemplateColumns: "24px 180px 1fr 1fr 24px",
                }}
              >
                <span style={{ color: "var(--fg-3)", cursor: "grab" }}>
                  ≡
                </span>
                <span className="t-meta">
                  {t.cadence_days
                    ? `Auto · every ${t.cadence_days}d`
                    : "Manual only"}
                </span>
                <span className="t-display-sm">{t.name}</span>
                <span className="t-body-2">
                  {t.cadence_days
                    ? `Next ${
                        t.next_run_at
                          ? new Date(t.next_run_at).toLocaleDateString()
                          : "—"
                      }`
                    : "Run on demand"}
                </span>
                <CreateFromTemplateButton
                  templateId={t.id}
                  defaultName={t.config?.source_name ?? "New event"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
