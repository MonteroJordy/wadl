import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
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
          <div className="w-type-meta">TEMPLATES</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Templates
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Save {event.name}&apos;s shape (nights + allocations, no guests) as
            a reusable starting point.
          </p>
        </div>

        <section style={{ marginBottom: 32 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            NEW TEMPLATE FROM THIS EVENT
          </div>
          <TemplateForm eventId={event.id} />
        </section>

        <section>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            ALL TEMPLATES
          </div>
          {tpls.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              None yet.
            </p>
          ) : (
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {tpls.map((t) => (
                <li key={t.id} className="w-card" style={{ padding: 16 }}>
                  <p
                    style={{ color: "var(--w-fg)", fontWeight: 600 }}
                  >
                    {t.name}
                  </p>
                  <div className="w-type-meta" style={{ marginTop: 6 }}>
                    {t.cadence_days
                      ? `AUTO EVERY ${t.cadence_days} DAYS · NEXT ${
                          t.next_run_at
                            ? new Date(t.next_run_at)
                                .toLocaleDateString()
                                .toUpperCase()
                            : "—"
                        }`
                      : "MANUAL ONLY"}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <CreateFromTemplateButton
                      templateId={t.id}
                      defaultName={t.config?.source_name ?? "New event"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
