import { requireOwnerContext } from "@/lib/owner";
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
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <p className="label-mono mb-1">Settings</p>
      <h1 className="display-lg leading-[0.95] mb-2">SMS templates</h1>
      <p className="text-muted text-sm mb-6">
        Pre-defined messages your team can send. Use{" "}
        <code className="text-cream font-mono text-xs">{`{{vars}}`}</code> to
        interpolate guest, event, and venue fields.
      </p>

      <TemplateManager initial={templates} />
    </main>
  );
}
