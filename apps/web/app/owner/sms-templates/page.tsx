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
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">SETTINGS</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            SMS templates
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Pre-defined messages your team can send. Use{" "}
            <code
              style={{
                color: "var(--w-fg)",
                fontFamily: "var(--w-mono)",
                fontSize: 12,
                background: "var(--w-surface-2)",
                padding: "2px 6px",
                border: "1px solid var(--w-line)",
              }}
            >
              {`{{vars}}`}
            </code>{" "}
            to interpolate guest, event, and venue fields.
          </p>
        </div>

        <TemplateManager initial={templates} />
      </div>
    </main>
  );
}
