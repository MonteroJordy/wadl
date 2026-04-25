/**
 * Minimal error-tracking shim.
 *
 * If SENTRY_DSN is set, posts directly to the Sentry "store" endpoint via
 * the Envelope API — no SDK dependency. Otherwise no-ops with a console.warn
 * so dev still sees the error.
 *
 * Use captureException() in catch blocks of API routes and server actions.
 * Use withCapture() to wrap a handler in a single try/catch.
 */

interface ContextHash {
  [key: string]: unknown;
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
