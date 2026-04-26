import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendSms } from "@/lib/sms";
import { hit as rateLimitHit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Day 27 — Door staff "Page the manager" endpoint.
 *
 * POST /api/notifications/escalate
 * Body: { eventId: string, nightId?: string, reason?: string }
 *
 * Auth: must be a logged-in user with an event_staff row (any role) for
 * the target event. Rate-limited to 3 escalations per minute per user
 * to keep one panicky bouncer from spamming.
 *
 * Effects:
 *   1. Insert door_escalation notification scoped to the venue's account.
 *   2. SMS the door_manager(s) directly with the reason and a link.
 *   3. Audit-logged.
 */

const RATE_LIMIT_PER_MIN = 3;

export async function POST(req: Request) {
  let payload: { eventId?: string; nightId?: string; reason?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const eventId = payload.eventId?.trim();
  const reason = (payload.reason ?? "").trim().slice(0, 200);
  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: "eventId required" },
      { status: 400 }
    );
  }

  // Day 29: dual-auth — cookies for web, Authorization: Bearer for mobile.
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  let user: { id: string } | null = null;
  if (bearer) {
    const adminAuth = createAdminClient();
    const { data } = await adminAuth.auth.getUser(bearer);
    user = data.user ?? null;
  } else {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 escalations per minute per user.
  const rl = rateLimitHit(`escalate:${user.id}`, {
    max: RATE_LIMIT_PER_MIN,
    refillMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "too many escalations — wait a minute" },
      { status: 429 }
    );
  }

  const admin = createAdminClient();

  // Verify the user is staff on this event (or owner of the account).
  const { data: staffRow } = await admin
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  let isAuthed = !!staffRow;
  let staffRole = staffRow?.role ?? null;

  if (!isAuthed) {
    // Owner self-bypass.
    const { data: ev } = await admin
      .from("events")
      .select("account:accounts!inner(owner_user_id)")
      .eq("id", eventId)
      .maybeSingle<{ account: { owner_user_id: string } }>();
    if (ev?.account.owner_user_id === user.id) {
      isAuthed = true;
      staffRole = "owner";
    }
  }
  if (!isAuthed) {
    return NextResponse.json(
      { ok: false, error: "not authorized for this event" },
      { status: 403 }
    );
  }

  // Get event + account for the notification + SMS targets.
  const { data: ev } = await admin
    .from("events")
    .select("id, name, account_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; name: string; account_id: string }>();
  if (!ev) {
    return NextResponse.json({ ok: false, error: "event not found" }, { status: 404 });
  }

  // Reporter name.
  const { data: reporter } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();
  const reporterName = reporter?.full_name ?? "Door";

  // Find door_manager phones (and the owner phone too — they may be on-site).
  const { data: managerRows } = await admin
    .from("event_staff")
    .select("user:profiles!inner(id, full_name, phone)")
    .eq("event_id", eventId)
    .eq("role", "door_manager");
  const managerPhones = (
    (managerRows ?? []) as unknown as Array<{
      user: { id: string; full_name: string | null; phone: string | null };
    }>
  )
    .map((r) => r.user.phone)
    .filter((p): p is string => !!p);

  // Insert notification.
  await notify(ev.account_id, "door_escalation", {
    message: `${reporterName} at the door needs the manager${reason ? `: ${reason}` : ""}.`,
    href: `/owner/events/${ev.id}`,
    event_id: ev.id,
    event_name: ev.name,
    reason: reason || null,
    reporter_user_id: user.id,
    reporter_role: staffRole,
  });

  // SMS each door manager (and owner if no manager defined).
  let smsSent = 0;
  if (managerPhones.length > 0) {
    for (const phone of managerPhones) {
      const res = await sendSms({
        to: phone,
        body: `WADL · Door at ${ev.name} needs you${reason ? `: ${reason}` : ""}. — ${reporterName}`,
        skipOptOutCheck: true, // operational page; not marketing
        log: { account_id: ev.account_id, event_id: ev.id },
      });
      if (res.ok) smsSent++;
    }
  } else {
    // Fall back to the account owner's phone.
    const { data: owner } = await admin
      .from("accounts")
      .select("owner:profiles!inner(phone)")
      .eq("id", ev.account_id)
      .maybeSingle<{ owner: { phone: string | null } }>();
    if (owner?.owner.phone) {
      const res = await sendSms({
        to: owner.owner.phone,
        body: `WADL · Door at ${ev.name} needs you${reason ? `: ${reason}` : ""}. — ${reporterName}`,
        skipOptOutCheck: true,
        log: { account_id: ev.account_id, event_id: ev.id },
      });
      if (res.ok) smsSent++;
    }
  }

  await admin.from("audit_log").insert({
    action: "door.escalation",
    entity_type: "event",
    entity_id: ev.id,
    actor_user_id: user.id,
    context: {
      reason: reason || null,
      reporter_role: staffRole,
      sms_sent: smsSent,
    },
  });

  return NextResponse.json({ ok: true, smsSent });
}
