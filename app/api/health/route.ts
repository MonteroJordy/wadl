import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDevMode } from "@/lib/app-url";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthBody {
  status: "ok" | "degraded" | "down";
  db: "ok" | "fail";
  twilio: "ok" | "fail" | "dev";
  version: string;
  timestamp: string;
}

async function checkDb(): Promise<"ok" | "fail"> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("events").select("id").limit(1);
    return error ? "fail" : "ok";
  } catch {
    return "fail";
  }
}

async function checkTwilio(): Promise<"ok" | "fail" | "dev"> {
  if (isDevMode()) return "dev";
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return "fail";

  // Bounded by AbortController so a hung Twilio API doesn't lock the
  // health probe. 3s is well above Twilio's typical p99.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3_000);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        },
        signal: ctrl.signal,
        cache: "no-store",
      }
    );
    return res.ok ? "ok" : "fail";
  } catch {
    return "fail";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const [db, twilio] = await Promise.all([checkDb(), checkTwilio()]);

  const status: HealthBody["status"] =
    db === "ok" && (twilio === "ok" || twilio === "dev")
      ? "ok"
      : db === "fail"
      ? "down"
      : "degraded";

  const body: HealthBody = {
    status,
    db,
    twilio,
    version: (pkg as { version?: string }).version ?? "0.0.0",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
