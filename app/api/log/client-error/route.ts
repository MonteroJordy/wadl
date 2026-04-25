import { NextResponse } from "next/server";
import { captureException } from "@/lib/sentry";

export const dynamic = "force-dynamic";

interface Payload {
  message?: string;
  digest?: string;
  stack?: string;
  url?: string;
}

export async function POST(req: Request) {
  let body: Payload = {};
  try {
    body = (await req.json()) as Payload;
  } catch {
    /* empty body OK */
  }
  // captureException always writes to error_log + Sentry if configured.
  await captureException(
    Object.assign(new Error(body.message ?? "client_error"), {
      stack: body.stack,
    }),
    {
      route: body.url ?? "unknown",
      severity: "error",
    }
  );
  return NextResponse.json({ ok: true });
}
