/**
 * Minimal error-tracking shim.
 *
 * Always writes to the public.error_log table (best-effort, soft-fails) so
 * the platform owner can review at /owner/errors without an external service.
 *
 * If SENTRY_DSN is set, ALSO posts to Sentry via the Envelope API — no SDK
 * dependency.
 *
 * Use captureException() in catch blocks of API routes and server actions.
 * Use withCapture() to wrap a handler in a single try/catch.
 */
import { createAdminClient } from "@/lib/supabase/admin";

interface ContextHash {
  [key: string]: unknown;
  /** If set, written to error_log.route. */
  route?: string;
  /** If set, written to error_log.user_id. */
  user_id?: string;
  /** If set, written to error_log.account_id. */
  account_id?: string;
  /** Defaults to 'error'. */
  severity?: "error" | "warn" | "fatal" | "info";
}

function parseDsn(
  dsn: string
): { url: string; publicKey: string; projectId: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "");
    if (!projectId) return null;
    const url = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
    return { url, publicKey: u.username, projectId };
  } catch {
    return null;
  }
}

export async function captureException(
  err: unknown,
  context?: ContextHash
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  // Always log to our own error_log table. Best-effort.
  try {
    const admin = createAdminClient();
    await admin.from("error_log").insert({
      route: context?.route ?? null,
      user_id: context?.user_id ?? null,
      account_id: context?.account_id ?? null,
      severity: context?.severity ?? "error",
      message: message.slice(0, 4000),
      stack: stack?.slice(0, 8000) ?? null,
      context: context ? (context as unknown as Record<string, unknown>) : null,
    });
  } catch {
    // best-effort — never let logging break the caller
  }

  if (!dsn) {
    // eslint-disable-next-line no-console
    console.warn("[sentry:noop]", message, context ?? "");
    return;
  }

  const parsed = parseDsn(dsn);
  if (!parsed) {
    // eslint-disable-next-line no-console
    console.warn("[sentry] invalid DSN:", dsn);
    return;
  }

  try {
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      message,
      exception: {
        values: [
          {
            type: err instanceof Error ? err.name : "Error",
            value: message,
            stacktrace: stack ? { frames: [{ function: stack.split("\n")[1] ?? "" }] } : undefined,
          },
        ],
      },
      extra: context ?? {},
      tags: { runtime: "node" },
    };
    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event);
    await fetch(parsed.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${parsed.publicKey},sentry_client=wadl/0.1`,
      },
      body: envelope,
    });
  } catch (postErr) {
    // eslint-disable-next-line no-console
    console.warn("[sentry] post failed:", (postErr as Error).message);
  }
}

/**
 * Wrap a handler so any throw is captured + re-thrown.
 * Useful for server actions / route handlers.
 */
export async function withCapture<T>(
  fn: () => Promise<T>,
  context?: ContextHash
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    await captureException(e, context);
    throw e;
  }
}
