# WADL — Deploy Guide

Production deploy is a one-time operation per environment. This guide walks the entire path from a local-only repo to a live URL with real SMS, real QR, real door scans.

> **Never paste real secrets into this file.** Treat every value below as a placeholder. Real values live only in `.env.local` (locally) and the Vercel project env (in production).

---

## 1. Pre-deploy checklist

Run this on `main` with a clean working tree:

```bash
# Tree clean?
git status

# All tests / type checks pass?
npx tsc --noEmit

# Build clean?
npx next build

# Prod-ready audit?
./scripts/check-prod-ready.sh
```

All four must pass. Specifically check:

- [ ] `git status` returns "nothing to commit, working tree clean"
- [ ] `npx tsc --noEmit` exits 0 with no output
- [ ] `npx next build` finishes with the route table and no `Failed to compile`
- [ ] `./scripts/check-prod-ready.sh` ends with `ALL GATES GREEN`
- [ ] All seven migrations have been applied to the prod Supabase project (see *Database state* in `WAKEUP_SUMMARY.md`)
- [ ] No `console.log` left in code (the script catches this; the only allow-listed one is in `lib/sms.ts`)
- [ ] Test phone `+13057990518` / `123456` is configured in Supabase Auth → Providers → Phone → Test Phone Numbers (kept for ongoing dev; NOT used in real prod traffic)
- [ ] You have a real personal phone you can scan a QR with

---

## 2. GitHub setup

Vercel imports from GitHub. Create the repo, push.

```bash
# Sign in to https://github.com (you should already have an account).

# Create the repo from the GitHub UI:
#   - Owner: your personal account or a "wadl-app" org
#   - Name: wadl
#   - Visibility: Private
#   - Do NOT initialize with README/license/.gitignore (we already have them)

# Add the remote and push.
git remote add origin git@github.com:<your-handle>/wadl.git
git push -u origin main
```

Verify the GitHub repo shows the latest commit + the project files. If push is rejected, check SSH key vs HTTPS and retry.

---

## 3. Vercel setup (do NOT click Deploy yet)

1. Go to https://vercel.com → **Sign Up** → **Continue with GitHub**.
2. Authorize the Vercel app to read the **wadl** repo (you can scope it to one repo).
3. **Add New** → **Project** → select **wadl** from the import list.
4. Framework preset auto-detects as **Next.js**.
5. **Root directory:** leave at `./`.
6. **Build & Output Settings:** leave defaults (`next build`, `.next`).
7. **Environment Variables:** click **Environment Variables** but DO NOT click Deploy. Fill the env vars in step 4 first.

---

## 4. Env vars to add in Vercel dashboard

Open the project → **Settings** → **Environment Variables**. For each row, set value, scope to all three environments (Production, Preview, Development), and add.

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL. Shipped to the browser. | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. Shipped to the browser. RLS-gated. | Supabase → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **SECRET.** Server-only. Bypasses RLS. | Supabase → Project Settings → API → `service_role` key |
| `SUPABASE_DB_URL` | Postgres connection string for migrations and direct queries. **SECRET.** | Supabase → Project Settings → Database → Connection string (URI, pooler) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app. Drives ticket / invite / magic-link URLs. | After first deploy: `https://<project-name>.vercel.app` (or your custom domain after step 7) |
| `DEV_MODE` | `false` to send real SMS via Twilio. Omit for auto-detect (https URL → false). | Set explicitly to `false` for production. |
| `TWILIO_ACCOUNT_SID` | Twilio account SID. Required for real SMS. | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio auth token. **SECRET.** | Twilio Console → Account Info |
| `TWILIO_FROM_NUMBER` | OR `TWILIO_MESSAGING_SERVICE_SID` — pick one. SMS sender. | Twilio Console → Phone Numbers (`TWILIO_FROM_NUMBER`) or Messaging → Services (`TWILIO_MESSAGING_SERVICE_SID`) |

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` are listed in `.env.local.example` but not used by MVP code — leave unset until v1.1 features land.

> **First-deploy tip:** if you don't yet know the Vercel URL (you don't until first deploy), set `NEXT_PUBLIC_APP_URL` to a placeholder like `https://wadl-deploy-pending.vercel.app`, deploy, then update it to the real URL and redeploy. The app boots fine; SMS bodies will contain the wrong link only on that first build.

---

## 5. Supabase URL allowlist

Supabase Auth blocks redirects + magic-link bounces from unknown origins. Tell Supabase about the Vercel domains.

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://<your-vercel-domain-or-custom-domain>`.
3. **Redirect URLs (Additional):** add each of:
   - `https://<project>.vercel.app/**`
   - `https://<project>-*.vercel.app/**` (covers preview deploys)
   - `https://<custom-domain>/**` (after step 7)
   - Optionally keep `http://localhost:3000/**` for local dev.
4. Save.

---

## 6. First deploy + verification

In Vercel, click **Deploy**. Watch the build log.

After deploy succeeds:

1. **Copy the Vercel URL** (`https://<project>.vercel.app`).
2. **Update `NEXT_PUBLIC_APP_URL` in Vercel env** to that URL (Settings → Environment Variables → edit).
3. **Trigger a redeploy** (Deployments → ⋯ → Redeploy) so the new env value is baked in.
4. **Hit the health endpoint:** `curl https://<project>.vercel.app/api/health`. Expect:
   ```json
   { "status": "ok", "db": "ok", "twilio": "ok", "version": "0.1.0", "timestamp": "..." }
   ```
   If `db: "fail"` → SUPABASE env vars wrong. If `twilio: "fail"` → Twilio env wrong or trial-account restriction. If `twilio: "dev"` → `DEV_MODE` is on (you forgot to set `DEV_MODE=false`).
5. **Visit the home page.** Should redirect to `/discover`.
6. **Visit `/login`.** Should render the phone entry form.

If any of these fail, see Section 9 (Rollback).

---

## 7. Custom domain (GoDaddy → Vercel)

Once the `.vercel.app` URL works, point a custom domain at it.

1. Vercel project → **Settings** → **Domains** → **Add** → enter `wadl.app` (or your domain).
2. Vercel shows the DNS record(s) to create. Two common cases:
   - **Apex domain (`wadl.app`):** A record → `76.76.21.21`
   - **Subdomain (`app.wadl.app`):** CNAME → `cname.vercel-dns.com`
3. In **GoDaddy** → My Products → DNS for the domain:
   - Add the A or CNAME record exactly as Vercel specified.
   - TTL: 1 hour (default is fine).
   - Save.
4. Back in Vercel, the domain row will flip from "Invalid Configuration" to "Valid Configuration" (1–60 minutes). Vercel auto-issues a TLS cert (Let's Encrypt) once DNS resolves.
5. **Update `NEXT_PUBLIC_APP_URL` in Vercel env to `https://<custom-domain>`** and redeploy.
6. **Re-add the custom domain to Supabase URL allowlist** (Section 5).

---

## 8. Post-deploy dry-run event smoke test

Run through the whole loop on the prod URL. Use real phones — no test-phone shortcut in prod.

1. **Owner sign-up.** From the prod URL, navigate to `/login`. Enter your real personal phone. Verify the OTP from Twilio SMS. Complete signup → entitysetup → venuesetup. Land on `/owner`.

2. **Create a real-but-throwaway event.** `/owner/events/new` → name "WADL Dry Run", type Venue-owned, one night dated tomorrow, capacity 5. Submit.

3. **Create one allocation.** `/owner/events/<id>/allocations/new` → "Test Promo", cap 5, +1s on, auto-approve off. Save. Copy the magic link.

4. **Open the magic link from a different phone or incognito.** Add a guest "Smoke Guest" with +1=1. Should land in pending.

5. **Approve from the queue.** `/owner/events/<id>/queue` → tap Approve. Status flips to approved.

6. **RSVP from a third phone (or your second device).** `/discover` → tap your event → tap RSVP → enter name, the second phone number, +1=0. Receive OTP via real Twilio SMS. Verify. **Receive ticket SMS with a `/t/<uuid>` URL.** Open it.

7. **Owner approves the walk-up.** Back on owner side, `/owner/events/<id>/queue` → approve "Smoke Guest 2". Refresh the ticket page → QR renders.

8. **Invite yourself as door staff.** `/owner/events/<id>/staff` → enter your owner phone, role door_staff → send. SMS arrives with `/staff-invite/<token>`. Open it on a phone-sized browser. Bind. Land on `/door/events/<id>`.

9. **Scan the QR.** From the staff side, **Scan**. Grant camera access. Point at the QR on the other phone. Overlay flashes APPROVED mint. Counter ticks up.

10. **Manual check-in.** Back on `/door/events/<id>` → **Search**. Type the first guest's name. Tap **Check in**. Counter ticks again.

11. **Recap shows numbers.** `/owner/events/<id>/recap` → see show rate, tier breakdown, top promoter.

12. **Audit trail confirms.** `/owner/events/<id>/audit` → see `door.scanned_in`, `door.manual_check_in`, `guest.rsvp`, `manual_add_at_door`, `staff.invite_accepted` — every action logged with your name + timestamp.

If all 12 land green, ship it. Tell Jordy you're live.

---

## 9. Rollback procedure

Vercel keeps every deploy reachable. Rollbacks are seconds, not minutes.

**Frontend regression (UI broke / bug crept in):**

1. Vercel project → **Deployments**.
2. Find the last known-good deploy.
3. Click ⋯ → **Promote to Production**.
4. Within ~10s the live URL serves the rolled-back build. No DNS change needed.

**Database migration regression (a migration broke prod data):**

1. Don't re-apply more migrations.
2. Open `psql` against `SUPABASE_DB_URL` and write a remediation SQL block (a forward fix, not a `pg_restore` — Supabase has point-in-time recovery via their support if catastrophic).
3. Capture the remediation as `supabase/migrations/<ts>_hotfix_<reason>.sql` so the prod DB stays in sync with the migration log.

**Twilio surprise (sent the wrong message / spent budget / triggered carrier filtering):**

1. Vercel env → set `DEV_MODE=true` → redeploy. SMS now console-logs server-side and stops sending.
2. Investigate. The audit log + Twilio console show what went out.
3. Set `DEV_MODE=false` → redeploy when fixed.

**Total panic — take it offline:**

1. Vercel project → **Settings** → **General** → scroll to **Production Deployment** → **Disable**.
2. The custom domain serves a Vercel error page. The data is untouched.
3. Re-enable when ready.

---

That's the whole loop. Save this file, follow it once, you'll never need to read it again.
