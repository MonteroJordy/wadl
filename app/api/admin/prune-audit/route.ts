import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

/**
 * Prune old audit_log + error_log rows. Default 180-day retention.
 *
 * AuthZ: either Vercel Cron (Authorization: Bearer $CRON_SECRET) OR
 * the platform-owner email signed in.
 *
 * Query: ?older_than=180d (default 180d). Accepts NNd or NNh.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // AuthZ.
  const cronAuth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const cronOK =
    cronSecret && cronAuth === `Bearer ${cronSecret}`;

  let userOK = false;
  if (!cronOK) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .maybeSingle<{ email: string | null }>();
      userOK = prof?.email === PLATFORM_OWNER_EMAIL;
    }
  }

  if (!cronOK && !userOK) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse retention.
  const olderThan = url.searchParams.get("older_than") ?? "180d";
  const m = /^(\d+)([dh])$/.exec(olderThan);
  if (!m) {
    return NextResponse.json(
      { error: "older_than must look like 180d or 24h" },
      { status: 400 }
    );
  }
  const n = parseInt(m[1], 10);
  const ms = m[2] === "d" ? n * 86_400_000 : n * 3_600_000;
  const cutoff = new Date(Date.now() - ms).toISOString();

  const admin = createAdminClient();
  const [auditRes, errorRes, deliveryRes] = await Promise.all([
    admin.from("audit_log").delete({ count: "exact" }).lt("created_at", cutoff),
    admin.from("error_log").delete({ count: "exact" }).lt("occurred_at", cutoff),
    // Webhook deliveries that were either delivered OR exhausted (attempt>=5).
    admin
      .from("webhook_deliveries")
      .delete({ count: "exact" })
      .lt("created_at", cutoff)
      .or("delivered_at.not.is.null,attempt.gte.5"),
  ]);

  return NextResponse.json({
    ok: true,
    cutoff,
    pruned: {
      audit_log: auditRes.count ?? 0,
      error_log: errorRes.count ?? 0,
      webhook_deliveries: deliveryRes.count ?? 0,
    },
  });
}
