/**
 * Event template cloning logic — shared by the user-triggered
 * createFromTemplateAction in /owner/events/[id]/template/actions.ts
 * and the daily cron worker in /api/cron/recurring-events.
 *
 * Day 25.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface NightConfig {
  doors_at_h: number;
  doors_at_m: number;
  capacity_cap: number | null;
  lockdown_threshold_pct: number;
}

export interface AllocConfig {
  holder_name: string;
  cap: number;
  auto_approve: boolean;
  list_open: boolean;
  plus_ones_allowed: boolean;
}

export interface TemplateConfig {
  source_name: string;
  description: string | null;
  flyer_url: string | null;
  event_type: string;
  venue_id: string | null;
  nights: NightConfig[];
  allocations: AllocConfig[];
}

export interface CloneTemplateInput {
  /** Service-role admin client OR an authenticated supabase client. */
  supabase: SupabaseClient;
  accountId: string;
  createdBy: string;
  config: TemplateConfig;
  newName: string;
  /** Anchor date for the first night. Defaults to today. */
  startDate?: Date;
}

export type CloneTemplateResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

/**
 * Clone a template config into a new events + event_nights + allocations
 * tree. Idempotency is the caller's responsibility (the cron uses
 * event_template_runs to ensure once-per-cadence_days).
 */
export async function cloneTemplate({
  supabase,
  accountId,
  createdBy,
  config,
  newName,
  startDate,
}: CloneTemplateInput): Promise<CloneTemplateResult> {
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .insert({
      account_id: accountId,
      venue_id: config.venue_id,
      event_type: config.event_type,
      name: newName.trim() || `${config.source_name} (auto)`,
      description: config.description,
      flyer_url: config.flyer_url,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (evErr || !ev) return { ok: false, error: evErr?.message ?? "Insert failed." };

  // Build nights anchored to startDate (default today).
  const anchor = new Date(startDate ?? Date.now());
  anchor.setHours(0, 0, 0, 0);

  const nightRows = config.nights.map((n, i) => {
    const date = new Date(anchor);
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

  const { data: insertedNights } = await supabase
    .from("event_nights")
    .insert(nightRows)
    .select("id");

  // Allocations distributed onto first night (matches user-action behavior).
  if (config.allocations.length > 0 && insertedNights && insertedNights[0]) {
    await supabase.from("allocations").insert(
      config.allocations.map((a) => ({
        event_night_id: insertedNights[0].id,
        holder_name: a.holder_name,
        cap: a.cap,
        auto_approve: a.auto_approve,
        list_open: a.list_open,
        plus_ones_allowed: a.plus_ones_allowed,
        created_by: createdBy,
      }))
    );
  }

  return { ok: true, eventId: ev.id };
}
