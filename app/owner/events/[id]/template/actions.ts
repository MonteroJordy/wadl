"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

interface SaveTemplateInput {
  name: string;
  cadence_days: number | null;
}

interface NightConfig {
  doors_at_h: number;
  doors_at_m: number;
  capacity_cap: number | null;
  lockdown_threshold_pct: number;
}

interface AllocConfig {
  holder_name: string;
  cap: number;
  auto_approve: boolean;
  list_open: boolean;
  plus_ones_allowed: boolean;
}

interface TemplateConfig {
  source_name: string;
  description: string | null;
  flyer_url: string | null;
  event_type: string;
  venue_id: string | null;
  nights: NightConfig[];
  allocations: AllocConfig[];
}

export async function saveTemplateAction(
  sourceEventId: string,
  input: SaveTemplateInput
): Promise<{ ok: true; templateId: string } | { ok: false; error: string }> {
  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: ev } = await admin
    .from("events")
    .select(
      "id, name, description, flyer_url, event_type, venue_id, account_id, event_nights(doors_at, capacity_cap, lockdown_threshold_pct, allocations(holder_name, cap, auto_approve, list_open, plus_ones_allowed))"
    )
    .eq("id", sourceEventId)
    .maybeSingle<{
      id: string;
      name: string;
      description: string | null;
      flyer_url: string | null;
      event_type: string;
      venue_id: string | null;
      account_id: string;
      event_nights: Array<{
        doors_at: string;
        capacity_cap: number | null;
        lockdown_threshold_pct: number;
        allocations: Array<{
          holder_name: string;
          cap: number;
          auto_approve: boolean;
          list_open: boolean;
          plus_ones_allowed: boolean;
        }>;
      }>;
    }>();

  if (!ev || ev.account_id !== account.id)
    return { ok: false, error: "Not authorized." };

  const config: TemplateConfig = {
    source_name: ev.name,
    description: ev.description,
    flyer_url: ev.flyer_url,
    event_type: ev.event_type,
    venue_id: ev.venue_id,
    nights: ev.event_nights.map((n) => {
      const d = new Date(n.doors_at);
      return {
        doors_at_h: d.getHours(),
        doors_at_m: d.getMinutes(),
        capacity_cap: n.capacity_cap,
        lockdown_threshold_pct: n.lockdown_threshold_pct,
      };
    }),
    allocations: ev.event_nights.flatMap((n) =>
      (n.allocations ?? []).map((a) => ({
        holder_name: a.holder_name,
        cap: a.cap,
        auto_approve: a.auto_approve,
        list_open: a.list_open,
        plus_ones_allowed: a.plus_ones_allowed,
      }))
    ),
  };

  const { data: tpl, error } = await admin
    .from("event_templates")
    .insert({
      account_id: account.id,
      source_event_id: sourceEventId,
      name: input.name.trim() || `Template from ${ev.name}`,
      config: config as unknown as Record<string, unknown>,
      cadence_days: input.cadence_days,
      next_run_at: input.cadence_days
        ? new Date(Date.now() + input.cadence_days * 24 * 60 * 60 * 1000).toISOString()
        : null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !tpl) return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath(`/owner/events/${sourceEventId}/template`);
  return { ok: true, templateId: tpl.id };
}

export async function createFromTemplateAction(
  templateId: string,
  newName: string
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: tpl } = await admin
    .from("event_templates")
    .select("id, account_id, name, config")
    .eq("id", templateId)
    .maybeSingle<{
      id: string;
      account_id: string;
      name: string;
      config: TemplateConfig;
    }>();
  if (!tpl || tpl.account_id !== account.id)
    return { ok: false, error: "Template not found." };

  const cfg = tpl.config;

  const { data: ev, error: evErr } = await admin
    .from("events")
    .insert({
      account_id: account.id,
      venue_id: cfg.venue_id,
      event_type: cfg.event_type,
      name: newName.trim() || `${cfg.source_name} (from template)`,
      description: cfg.description,
      flyer_url: cfg.flyer_url,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (evErr || !ev) return { ok: false, error: evErr?.message ?? "Insert failed." };

  // Build nights starting from today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nightRows = cfg.nights.map((n, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(n.doors_at_h, n.doors_at_m, 0, 0);
    const cutoff = new Date(date.getTime() - 2 * 60 * 60 * 1000);
    return {
      event_id: ev.id,
      night_date: date.toISOString().slice(0, 10),
      doors_at: date.toISOString(),
      cutoff_at: cutoff.toISOString(),
      capacity_cap: n.capacity_cap,
      lockdown_threshold_pct: n.lockdown_threshold_pct,
    };
  });
  const { data: insertedNights } = await admin
    .from("event_nights")
    .insert(nightRows)
    .select("id");

  // Allocations distributed onto first night (shape match).
  if (cfg.allocations.length > 0 && insertedNights && insertedNights[0]) {
    await admin.from("allocations").insert(
      cfg.allocations.map((a) => ({
        event_night_id: insertedNights[0].id,
        holder_name: a.holder_name,
        cap: a.cap,
        auto_approve: a.auto_approve,
        list_open: a.list_open,
        plus_ones_allowed: a.plus_ones_allowed,
        created_by: profile.id,
      }))
    );
  }

  revalidatePath("/owner");
  return { ok: true, eventId: ev.id };
}
