import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cloneTemplate, type TemplateConfig } from "@/lib/event-template";

export const dynamic = "force-dynamic";

/**
 * Recurring event cron worker (Day 25).
 *
 * Runs daily (Vercel Cron in vercel.json: "0 9 * * *" UTC = 4am ET / 1am PT).
 *
 * For each event_templates row where cadence_days IS NOT NULL AND next_run_at
 * is in the past (or null and cadence_days set), we clone the template into
 * a new event and bump next_run_at by cadence_days.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` (where
 * CRON_SECRET is the project's vercel-managed secret) OR we accept the
 * `x-vercel-cron` header. Manual invocation requires a matching CRON_SECRET.
 *
 * Audit trail: every attempt writes one event_template_runs row, regardless
 * of outcome. That's how the operator sees what fired and what didn't.
 */

interface TemplateRow {
  id: string;
  account_id: string;
  name: string;
  config: TemplateConfig;
  cadence_days: number;
  next_run_at: string | null;
  created_by: string;
}

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // No secret set → only allow Vercel-internal cron. The header
    // `x-vercel-cron: 1` is set by Vercel's scheduler.
    return req.headers.get("x-vercel-cron") === "1";
  }
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

async function runOnce(): Promise<{
  attempted: number;
  created: number;
  skipped: number;
  errors: number;
  results: Array<{ template_id: string; outcome: string; reason?: string; event_id?: string }>;
}> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Pull templates due now.
  const { data: due } = await admin
    .from("event_templates")
    .select("id, account_id, name, config, cadence_days, next_run_at, created_by")
    .not("cadence_days", "is", null)
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .limit(100);

  const rows = (due ?? []) as unknown as TemplateRow[];
  const results: Array<{
    template_id: string;
    outcome: string;
    reason?: string;
    event_id?: string;
  }> = [];

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const tpl of rows) {
    // Idempotency guard: if event_template_runs already has a "created" row
    // within the last 23 hours, skip. Belts-and-braces against double-fire.
    const since = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("event_template_runs")
      .select("id")
      .eq("template_id", tpl.id)
      .eq("outcome", "created")
      .gte("ran_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      await admin.from("event_template_runs").insert({
        template_id: tpl.id,
        outcome: "skipped",
        reason: "already created in last 23h",
      });
      skipped++;
      results.push({ template_id: tpl.id, outcome: "skipped", reason: "duplicate guard" });
      continue;
    }

    const cloneRes = await cloneTemplate({
      supabase: admin,
      accountId: tpl.account_id,
      createdBy: tpl.created_by,
      config: tpl.config,
      newName: `${tpl.config.source_name}`,
    });

    if (!cloneRes.ok) {
      await admin.from("event_template_runs").insert({
        template_id: tpl.id,
        outcome: "error",
        reason: cloneRes.error.slice(0, 500),
      });
      errors++;
      results.push({ template_id: tpl.id, outcome: "error", reason: cloneRes.error });
      continue;
    }

    // Bump next_run_at by cadence_days.
    const next = new Date(Date.now() + tpl.cadence_days * 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from("event_templates")
      .update({ next_run_at: next })
      .eq("id", tpl.id);

    await admin.from("event_template_runs").insert({
      template_id: tpl.id,
      outcome: "created",
      created_event_id: cloneRes.eventId,
    });

    await admin.from("audit_log").insert({
      action: "event_template.auto_created",
      entity_type: "event",
      entity_id: cloneRes.eventId,
      context: { template_id: tpl.id, cadence_days: tpl.cadence_days },
    });

    created++;
    results.push({
      template_id: tpl.id,
      outcome: "created",
      event_id: cloneRes.eventId,
    });
  }

  return { attempted: rows.length, created, skipped, errors, results };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOnce();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[cron:recurring-events] failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Vercel Cron uses GET; allow POST for manual ops too.
export const POST = GET;
