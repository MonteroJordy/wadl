/**
 * Single source of truth for the app's base URL and dev-vs-prod mode.
 *
 * Env contract:
 *   - NEXT_PUBLIC_APP_URL is required. Local dev sets http://localhost:3000;
 *     prod sets https://<vercel-domain> or the custom domain.
 *   - DEV_MODE (optional) overrides the auto-detect. Useful for testing
 *     real SMS from a non-prod URL or for forcing dev fallback in prod.
 *
 * Auto-detect rules (when DEV_MODE is unset):
 *   - URL starts with `https://` → prod (DEV_MODE=false → real Twilio).
 *   - URL contains `localhost` or `127.0.0.1` → dev (console-log SMS).
 *   - Anything else → dev, on the principle that prod must be deliberate.
 */

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set. Add it to .env.local locally or to the Vercel project env."
    );
  }
  return url.replace(/\/$/, "");
}

export function isDevMode(): boolean {
  const explicit = process.env.DEV_MODE;
  if (explicit !== undefined) return explicit.toLowerCase() !== "false";

  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (url.startsWith("https://")) {
    // Treat any explicit https URL as prod, even if it happens to be
    // https://localhost (rare; HTTPS dev requires extra setup anyway).
    if (url.includes("localhost") || url.includes("127.0.0.1")) return true;
    return false;
  }
  return true;
}
