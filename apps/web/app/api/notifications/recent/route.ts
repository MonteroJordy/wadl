import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/owner";

export const dynamic = "force-dynamic";

/**
 * Last 10 notifications for the current owner account. Powers the
 * inline notification dropdown in the topbar so the user can triage
 * without leaving the page.
 */
export async function GET() {
  try {
    const { supabase, account } = await requireOwnerContext();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, payload, read_at, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return NextResponse.json({ ok: true, notifications: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load",
      },
      { status: 500 },
    );
  }
}
