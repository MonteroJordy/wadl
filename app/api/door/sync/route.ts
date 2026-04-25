import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface QueuedScan {
  /** ms epoch when the QR was scanned offline. */
  scanned_at: number;
  /** Token decoded from the QR. */
  token: string;
  event_id: string;
  night_id: string;
}

interface SyncResult {
  token: string;
  scanned_at_ms: number;
  ok: boolean;
  state?: string;
  reason?: string;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { scans?: QueuedScan[] };
  try {
    payload = (await req.json()) as { scans?: QueuedScan[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const scans = payload.scans ?? [];

  const admin = createAdminClient();
  const out: SyncResult[] = [];

  for (const s of scans) {
    if (!s.token || !s.night_id || !s.event_id) {
      out.push({
        token: s.token ?? "",
        scanned_at_ms: s.scanned_at,
        ok: false,
        reason: "missing_fields",
      });
      continue;
    }

    const { data: guest } = await admin
      .from("guests")
      .select(
        "id, status, flag_dna, flag_reason, event_night_id, night:event_nights!inner(id, event:events!inner(id))"
      )
      .eq("check_in_token", s.token)
      .maybeSingle<{
        id: string;
        status: string;
        flag_dna: boolean;
        flag_reason: string | null;
        event_night_id: string;
        night: { id: string; event: { id: string } };
      }>();

    if (!guest) {
      out.push({ token: s.token, scanned_at_ms: s.scanned_at, ok: false, reason: "not_found" });
      continue;
    }
    if (guest.night.event.id !== s.event_id) {
      out.push({ token: s.token, scanned_at_ms: s.scanned_at, ok: false, reason: "wrong_event" });
      continue;
    }
    if (guest.event_night_id !== s.night_id) {
      out.push({ token: s.token, scanned_at_ms: s.scanned_at, ok: false, reason: "wrong_night" });
      continue;
    }
    if (guest.flag_dna) {
      // Still record the attempt.
      const at = new Date(s.scanned_at).toISOString();
      await admin.from("check_ins").insert({
        guest_id: guest.id,
        event_night_id: guest.event_night_id,
        scanned_by: user.id,
        state: "do_not_admit",
        scanned_at: at,
      });
      out.push({ token: s.token, scanned_at_ms: s.scanned_at, ok: false, state: "do_not_admit" });
      continue;
    }
    if (guest.status !== "approved") {
      out.push({ token: s.token, scanned_at_ms: s.scanned_at, ok: false, reason: "not_approved" });
      continue;
    }

    // Conflict resolution: prefer earliest scan timestamp. If a prior approved scan
    // exists with an earlier scanned_at, this one becomes "already_used".
    const { data: prior } = await admin
      .from("check_ins")
      .select("id, scanned_at")
      .eq("guest_id", guest.id)
      .eq("state", "approved")
      .order("scanned_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; scanned_at: string }>();

    const offlineAt = new Date(s.scanned_at).toISOString();
    if (prior) {
      // If our offline scan is earlier than the existing approved one, replace.
      if (offlineAt < prior.scanned_at) {
        await admin
          .from("check_ins")
          .update({ state: "already_used" })
          .eq("id", prior.id);
        await admin.from("check_ins").insert({
          guest_id: guest.id,
          event_night_id: guest.event_night_id,
          scanned_by: user.id,
          state: "approved",
          scanned_at: offlineAt,
        });
        out.push({
          token: s.token,
          scanned_at_ms: s.scanned_at,
          ok: true,
          state: "approved_replaced",
        });
      } else {
        // Existing scan is earlier — record this as a duplicate attempt.
        await admin.from("check_ins").insert({
          guest_id: guest.id,
          event_night_id: guest.event_night_id,
          scanned_by: user.id,
          state: "already_used",
          scanned_at: offlineAt,
        });
        out.push({
          token: s.token,
          scanned_at_ms: s.scanned_at,
          ok: false,
          state: "already_used",
        });
      }
      continue;
    }

    await admin.from("check_ins").insert({
      guest_id: guest.id,
      event_night_id: guest.event_night_id,
      scanned_by: user.id,
      state: "approved",
      scanned_at: offlineAt,
    });
    await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "door.scanned_in",
      entity_type: "guest",
      entity_id: guest.id,
      event_id: s.event_id,
      context: { offline_sync: true },
    });
    out.push({
      token: s.token,
      scanned_at_ms: s.scanned_at,
      ok: true,
      state: "approved",
    });
  }

  return NextResponse.json({ ok: true, results: out });
}
