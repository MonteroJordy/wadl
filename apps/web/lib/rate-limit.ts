/**
 * In-memory token-bucket rate limiter. Per-process, so on Vercel each lambda
 * instance has its own state. Not perfect (cold-start resets, multi-region
 * skew), but enough to throttle abuse on public endpoints without an
 * external KV dependency.
 *
 * For real distributed rate limiting, swap the Map for Vercel KV / Upstash
 * Redis with the same hit() signature.
 */

interface Bucket {
  /** Tokens currently available (float). */
  tokens: number;
  /** Last refill ms epoch. */
  refilledAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Max tokens (also the burst). */
  max: number;
  /** How long it takes to fully refill from 0 (ms). */
  refillMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until at least one token becomes available. */
  retryAfterSec: number;
}

export function hit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: cfg.max, refilledAt: now };
    buckets.set(key, b);
  }
  // Refill.
  const elapsed = now - b.refilledAt;
  if (elapsed > 0) {
    const add = (elapsed / cfg.refillMs) * cfg.max;
    b.tokens = Math.min(cfg.max, b.tokens + add);
    b.refilledAt = now;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0 };
  }
  // Need 1 token; how long until refill yields 1?
  const need = 1 - b.tokens;
  const ms = (need / cfg.max) * cfg.refillMs;
  return {
    ok: false,
    remaining: 0,
    retryAfterSec: Math.max(1, Math.ceil(ms / 1000)),
  };
}

/** Common presets. */
export const LIMITS = {
  otpSendPerPhone: { max: 5, refillMs: 60_000 },        // 5/min
  holderAddPerToken: { max: 20, refillMs: 60_000 },     // 20/min
  embedRsvpPerIp: { max: 20, refillMs: 60_000 },        // 20/min
  rsvpFromTicketPerGuest: { max: 5, refillMs: 60_000 }, // 5/min
} as const satisfies Record<string, RateLimitConfig>;

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Build a 429 NextResponse with Retry-After header.
 */
export function tooManyRequestsResponse(retryAfterSec: number): {
  status: number;
  headers: Record<string, string>;
  body: { error: string; retry_after: number };
} {
  return {
    status: 429,
    headers: { "Retry-After": String(retryAfterSec) },
    body: {
      error: `Too many requests. Try again in ${retryAfterSec}s.`,
      retry_after: retryAfterSec,
    },
  };
}
