"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseChatHub, type ParsedLine } from "@/lib/chathub";

export type ParseResult =
  | { ok: true; backend: "claude" | "regex"; rows: ParsedLine[] }
  | { ok: false; error: string };

export async function parseChatAction(
  eventId: string,
  text: string,
  defaultHolder: string | null
): Promise<ParseResult> {
  if (!text || !text.trim()) return { ok: false, error: "Paste at least one name." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  // Verify ownership.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Event not found." };

  const result = await parseChatHub(text, defaultHolder);
  return { ok: true, backend: result.backend, rows: result.rows };
}

interface CommitRow {
  name: string;
  tier: "ga" | "vip" | "all_access";
  plus_ones: number;
  attributed_to_holder_name: string | null;
  raw_line: string;
}

export async function commitChatAction(
  eventId: string,
  nightId: string,
  fallbackAllocationId: string | null,
  rows: CommitRow[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!rows || rows.length === 0) return { ok: false, error: "Nothing to commit." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const admin = createAdminClient();

  // Verify night belongs to event + ownership.
  const { data: night } = await admin
    .from("event_nights")
    .select("id, event_id, event:events!inner(account_id)")
    .eq("id", nightId)
    .maybeSingle<{
      id: string;
      event_id: string;
      event: { account_id: string };
    }>();
  if (!night || night.event_id !== eventId) {
    return { ok: false, error: "Night mismatch." };
  }

  // Pull this night's allocations to map names → IDs.
  const { data: allocs } = await admin
    .from("allocations")
    .select("id, holder_name, auto_approve")
    .eq("event_night_id", nightId);
  const byName = new Map<
    string,
    { id: string; auto_approve: boolean }
  >();
  for (const a of (allocs ?? []) as Array<{
    id: string;
    holder_name: string;
    auto_approve: boolean;
  }>) {
    byName.set(a.holder_name.toLowerCase(), {
      id: a.id,
      auto_approve: a.auto_approve,
    });
  }
  const fallback = fallbackAllocationId
    ? (allocs ?? []).find((a) => a.id === fallbackAllocationId) ?? null
    : null;

  let inserted = 0;
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const holder = r.attributed_to_holder_name
      ? byName.get(r.attributed_to_holder_name.toLowerCase())
      : null;
    const allocation = holder ?? fallback;
    const status = allocation?.auto_approve ? "approved" : "pending";

    const { error: insErr } = await admin.from("guests").insert({
      event_night_id: nightId,
      allocation_id: allocation?.id ?? null,
      full_name: name,
      tier: r.tier,
      plus_ones: r.plus_ones,
      status,
      added_by_user_id: user.id,
    });
    if (insErr) continue;
    inserted += 1;
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "chathub_add",
    entity_type: "event_night",
    entity_id: nightId,
    event_id: eventId,
    context: { count: inserted, total_attempted: rows.length },
  });

  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath(`/owner/events/${eventId}/queue`);

  return { ok: true, count: inserted };
}
