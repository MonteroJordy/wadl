import { NextResponse } from "next/server";
import { captureException } from "@/lib/sentry";
import { hit, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface Payload {
  message?: string;
  digest?: string;
  stack?: string;
  url?: string;
}

// Public endpoint (Day 19 P1-4): error.tsx fires from anonymous + authed
// users alike, so we accept both. Rate-limited per IP to deter spam since
// there's no auth gate.
const CLIENT_ERROR_LIMIT = { max: 10, refillMs: 60_000 }; // 10/min/IP

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = hit(`client-error:${ip}`, CLIENT_ERROR_LIMIT);
  if (!limit.ok) {
    const r = tooManyRequestsResponse(limit.retryAfterSec);
    return NextResponse.json(r.body, { status: r.status, headers: r.headers });
  }

  let body: Payload = {};
  try {
    body = (await req.json()) as Payload;
  } catch {
    /* empty body OK */
  }

  // Cap field sizes to prevent log-table abuse.
  const message = (body.message ?? "client_error").slice(0, 500);
  const stack = body.stack?.slice(0, 4000);
  const url = body.url?.slice(0, 500);

  // captureException always writes to error_log + Sentry if configured.
  await captureException(
    Object.assign(new Error(message), { stack }),
    {
      route: url ?? "unknown",
      severity: "error",
      ip,
    }
  );
  return NextResponse.json({ ok: true });
}
