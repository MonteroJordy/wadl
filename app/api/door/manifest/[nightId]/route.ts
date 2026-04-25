import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ManifestGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  flag_reason: string | null;
  check_in_token: string;
  scanned: boolean;
}

/**
 * Returns the night's guest manifest for offline scanning.
 * Authorization: account owner OR door staff/manager assigned to the event.
 */
export async function GET(
  _req: Request,
  { params }: { params: { nightId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: night } = await admin
    .from("event_nights")
    .select("id, event_id, event:events!inner(id, account_id)")
    .eq("id", params.nightId)
    .maybeSingle<{
      id: string;
      event_id: string;
      event: { id: string; account_id: string };
    }>();
  if (!night) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // AuthZ: owner of account, OR staff on event.
  const { data: account } = await admin
    .from("accounts")
    .select("owner_user_id")
    .eq("id", night.event.account_id)
    .maybeSingle<{ owner_user_id: string }>();
  let allowed = account?.owner_user_id === user.id;
  if (!allowed) {
    const { data: staff } = await admin
      .from("event_staff")
      .select("role")
      .eq("event_id", night.event_id)
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = !!staff;
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Pull guests + scanned status.
  const { data: rows } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, tier, status, flag_dna, flag_reason, check_in_token, check_ins(state)"
    )
    .eq("event_night_id", params.nightId)
    .not("check_in_token", "is", null);

  const guests: ManifestGuest[] = (
    (rows ?? []) as Array<{
      id: string;
      full_name: string;
      plus_ones: number;
      tier: string;
      status: string;
      flag_dna: boolean;
      flag_reason: string | null;
      check_in_token: string;
      check_ins: Array<{ state: string }>;
    }>
  ).map((g) => ({
    id: g.id,
    full_name: g.full_name,
    plus_ones: g.plus_ones,
    tier: g.tier,
    status: g.status,
    flag_dna: g.flag_dna,
    flag_reason: g.flag_reason,
    check_in_token: g.check_in_token,
    scanned: g.check_ins.some((c) => c.state === "approved"),
  }));

  return NextResponse.json(
    {
      ok: true,
      night_id: params.nightId,
      event_id: night.event_id,
      generated_at: new Date().toISOString(),
      guests,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
