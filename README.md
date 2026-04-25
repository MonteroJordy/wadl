# WADL

WADL is a guest-list management platform for nightlife venues, brands, artists, and promoters. It replaces the WhatsApp-and-spreadsheet chaos at every venue's door with one attributed, auditable, tiered list. Owners create events. Promoters distribute their cuts of the list via magic links. Guests RSVP and get a QR by SMS. Staff scan QRs at the door with a camera. Every action — every name added, every approval, every check-in, every "do not admit" flag — is attributed and logged. Built by Jordy Montero (who runs marketing for major DJs / brands / venues in Miami and works the door himself) on a tight 7-day MVP cut.

## Tech stack

- **Web:** Next.js 14 App Router, React 18, Tailwind 3 (mobile-first 375px frames; coral / mint / gold / lavender role accents on a near-black canvas)
- **Backend:** Supabase — Postgres for storage, Auth for phone-OTP + email/password, RLS enabled on every table from day one, service-role key for trusted server-side flows (magic-link writes, public reads on `/discover`)
- **SMS:** Twilio REST (no SDK dependency, hits the bare HTTPS API). A `DEV_MODE` env var swaps Twilio for a server-console fallback so local dev needs no carrier credentials.
- **QR:** `qrcode` (server-rendered SVG) for ticket pages; `@zxing/browser` (camera continuous decode) for the door scanner.
- **Hosting:** Vercel. Migrations applied via plain `psql` against the Supabase Postgres URL.

## Local dev

You need Node 20+, npm, and `psql` (`brew install postgresql@16` on macOS).

1. `cp .env.local.example .env.local` then fill in real values. Never commit `.env.local`.
2. `npm install`.
3. Apply migrations in order:
   ```bash
   for f in supabase/migrations/*.sql; do
     /opt/homebrew/opt/postgresql@16/bin/psql "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```
4. Configure the test phone in Supabase: Auth → Providers → Phone → enable + add `+13057990518` / OTP `123456` (no real SMS needed for development).
5. `npm run dev`. The app lands on `/discover`; `/login` is the owner/staff entry. The seven-day day-by-day status, smoke tests, and judgment calls are documented in `WAKEUP_SUMMARY.md`.

## Deploy to production

`DEPLOY.md` walks GitHub setup, Vercel import, env-var configuration, Supabase URL allowlist, custom domain via GoDaddy, the 12-step post-deploy dry-run smoke test, and rollback procedure. Run `./scripts/check-prod-ready.sh` before every deploy — it gates on no stray `console.log`, every `process.env` reference being declared in `.env.local.example`, no open `TODO`/`FIXME`, and a clean `next build`.

## License

Proprietary. © Mainframe Agency / Jordy Montero. All rights reserved. No part of this codebase may be redistributed, sublicensed, or used to operate a competing service without written permission.
