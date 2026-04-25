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
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <Link
        href={`/owner/events/${event.id}`}
        className="label-mono hover:text-cream"
      >
        ← Back
      </Link>
      <h1 className="display-lg mt-3 mb-2">Templates</h1>
      <p className="label-mono mb-6">
        Save {event.name}&apos;s shape (nights + allocations, no guests) as a reusable starting point.
      </p>

      <section className="mb-8">
        <p className="label-mono mb-3">New template from this event</p>
        <TemplateForm eventId={event.id} />
      </section>

      <section>
        <p className="label-mono mb-3">All templates</p>
        {tpls.length === 0 ? (
          <p className="text-muted text-sm">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tpls.map((t) => (
              <li key={t.id} className="card">
                <p className="font-sans text-cream font-semibold">{t.name}</p>
                <p className="label-mono mt-1">
                  {t.cadence_days
                    ? `Auto every ${t.cadence_days} days · next ${t.next_run_at ? new Date(t.next_run_at).toLocaleDateString() : "—"}`
                    : "Manual only"}
                </p>
                <CreateFromTemplateButton
                  templateId={t.id}
                  defaultName={t.config?.source_name ?? "New event"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
