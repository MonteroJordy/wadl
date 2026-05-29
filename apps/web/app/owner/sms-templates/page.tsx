import { requireOwnerContext } from "@/lib/owner";
import { PageHeader } from "@/components/v5";
import TemplateManager from "./template-form";

export const dynamic = "force-dynamic";

export default async function SmsTemplatesPage() {
  const { supabase, account } = await requireOwnerContext();
  const { data: rows } = await supabase
    .from("sms_templates")
    .select("key, label, body")
    .eq("account_id", account.id)
    .order("label");
  const templates = (rows ?? []) as Array<{
    key: string;
    label: string;
    body: string;
  }>;

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Settings"
        title="SMS templates"
        sub={
          <>
            Pre-defined messages your team can send. Use{" "}
            <code className="kbd">{`{{vars}}`}</code> to interpolate guest,
            event, and venue fields.
          </>
        }
      />
      <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
        <TemplateManager initial={templates} />
      </div>
    </main>
  );
}
