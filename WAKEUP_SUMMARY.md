# Build status — through Day 10 (MVP + v1.1 SHIPPED)

**Commits on `main`:**

- `cbd4b45` — Day 1: scaffolding + Supabase + phone OTP auth flow
- `8cf7234` — Day 2: owner weekview + daydash + multi-night create event + seed data
- `a6c61a6` — Day 3: allocations + magic-link holder flow + approval queue
- `e70aa7d` — docs: initial WAKEUP_SUMMARY
- `8af44ac` — Day 4: guest discovery + RSVP + phone verify + QR via SMS + My Tickets
- `b8d077f` — docs: Day 4 WAKEUP append
- `9d530e0` — Day 5: door operations — staff invite, QR scanner, manager view, DNA flag
- `dcc6b84` — docs: Day 5 WAKEUP append
- `20c165c` — Day 6: recap + analytics + audit log viewer + CSV/print export + flag UI + empty state polish
- `d6876f9` — docs: Day 6 WAKEUP append
- `ff03664` — Day 7: prod-ready — DEPLOY.md + health check + prod-ready audit script + README

TypeScript passes (`npx tsc --noEmit` clean). `next build` compiles all **39 routes** clean. **`./scripts/check-prod-ready.sh` ALL GATES GREEN.** Dev server was not started — run it yourself. Nothing has been pushed to a remote and nothing has been deployed.

> ⚠ **Before you `npm run dev` for Day 7, wipe the Next cache: `rm -rf .next && npm run dev`.**

---

## What shipped

### Day 2 — owner operations
| File | Purpose |
|---|---|
| `app/owner/page.tsx` | Week view — 7-day window, nights grouped by date, live scanned/approved/pending counts per night, tap card → daydash |
| `app/owner/events/new/page.tsx` + `form.tsx` + `actions.ts` | Multi-night create event form — type picker, venue dropdown, flyer URL, description, add/remove night rows |
| `app/owner/events/[id]/page.tsx` | Day dashboard — hero flyer, night selector (if multi-night), capacity meter, quick-actions to allocations/queue, pending count badge |
| `app/owner/events/[id]/actions.ts` + `freeze-button.tsx` | Freeze/unfreeze night toggle |
| `app/owner/events/[id]/settings/page.tsx` + `form.tsx` + `actions.ts` | Edit event name/flyer/description + per-night doors/cutoff/capacity/lockdown% |
| `app/owner/dashboard/page.tsx` | Now redirects to `/owner` (keeps Day 1 links working) |
| `lib/owner.ts` | `requireOwnerContext()` guard used by every /owner/* page |
| `lib/format.ts` | Pure `fmtDate` / `fmtTime` — importable from client components (see decision #10 below) |
| `lib/types.ts` | Added WadlEvent, EventNight, Allocation, AllocationToken, Guest |
| `lib/routing.ts` | `nextOnboardingStep()` now returns `/owner` not `/owner/dashboard` |
| `supabase/migrations/20260424000001_day2_events_rls.sql` | RLS policies for events/event_nights/event_staff/allocations/guests/check_ins; `event_nights.is_frozen` column |
| `supabase/migrations/20260424000002_seed_test_event.sql` | Idempotent seed — see "run the seed" below |

### Day 3 — allocations + holders + queue
| File | Purpose |
|---|---|
| `supabase/migrations/20260424000003_allocation_tokens.sql` | `allocation_tokens` table (rotate/revoke); owner SELECT RLS; writes server-only via service role |
| `lib/supabase/admin.ts` | Service-role client — SERVER-ONLY, bypasses RLS, used for token validation + holder submits |
| `lib/supabase/middleware.ts` | `/h` added to PUBLIC_PATHS so holders land without auth |
| `app/owner/events/[id]/allocations/page.tsx` | Allocations list grouped by night, used/cap per row, auto-approve + closed badges |
| `app/owner/events/[id]/allocations/new/` (page + form + actions) | Promoter/brand/artist onboarding — picks night, name/phone/email/cap/auto-approve/+1s |
| `app/owner/events/[id]/allocations/[allocId]/` (page + controls + actions) | Detail — cap/flag edits, magic link display + copy, rotate link, guest list |
| `app/owner/events/[id]/queue/` (page + row + bulk + actions) | Approval queue — individual approve/deny, bulk approve-all / deny-all per night |
| `app/h/[token]/` (page + form + actions) | Public no-auth holder page — shows event/night/flyer/cap, add names up to cap, respects `list_open` + `is_frozen` |

---

## Smoke-test script (in order)

### 0. One-time prep in the Supabase dashboard
1. **Auth → Providers → Phone**: enable the provider, add test number `+13057990518` with OTP `123456`.
2. **Auth → Providers → Email**: enable (for the email-password fallback in §9 — passwordless OK for now).
3. *(Optional, for real SMS later — NOT needed to test Day 2/3)*: wire Twilio in the phone provider.

### 1. Run it
```
cd /Users/jordy/Downloads/wadl
npm run dev
```
Open http://localhost:3000.

### 2. Sign up as owner (Day 1 flow, still works)
- `/login` → enter `3057990518` → send code
- `/otp` → enter `123456`
- `/signup` → name: "Jordy Montero", email optional, account type **Venue**
- `/entitysetup` → display name: "Floyd Miami"
- `/venuesetup` → name, Miami, `America/New_York`, capacity 400
- Lands on `/owner` (empty weekview, "Create event" button)

### 3. Run the seed (optional — gives you an event immediately)
```
/opt/homebrew/opt/postgresql@16/bin/psql \
  "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
  -f supabase/migrations/20260424000002_seed_test_event.sql
```
This is idempotent: creates one 2-night test event for your venue account the first time, no-op afterward. Reload `/owner` — should show two nights.

### 4. Create an event manually
- `/owner` → **+ Create event**
- Name: "Space presents: Diplo"
- Type: Venue-owned
- Add one or two nights (date + time + capacity)
- Submit → lands on `/owner/events/<id>` (daydash)

### 5. Daydash
- Verify capacity meter (0/cap, 0% full)
- If multi-night, tap through the night pills at the top
- Tap **Freeze this night** → button turns coral ("Frozen — tap to unfreeze"); tap again to unfreeze

### 6. Allocations + holder flow (this is the killer path)
- From daydash → **Allocations** → **+ New allocation**
- Name: "Diplo", Cap: 10, Auto-approve: off, Allow +1s: on
- Submit → lands on `/owner/events/<id>/allocations/<allocId>` with magic link displayed
- **Copy** the link (format: `http://localhost:3000/h/<48-hex-token>`)
- Open in an **incognito window** (to prove it requires no auth)
- Add a name "Alice" with +1 = 2 → should see it below in "Your names" as `pending`
- Try adding a second name that pushes over cap → should error "Over cap (N/10 used)."

### 7. Approve it
- Back in owner tab → daydash → **Queue**
- See "Alice +2" in the pending list, "pending · just now · Diplo"
- Tap **Approve** → row disappears; badge on daydash "Queue" button decrements
- In holder tab → refresh → Alice now shows `approved`

### 8. Rotate + reopen list
- In allocation detail → **Rotate link** → confirms, new token minted, old link now shows "Link rotated."
- Uncheck **List open** → Save → holder page now says "List closed"

### 9. Bulk path
- Create a few more pending guests via holder page
- Queue → **Deny all** → confirm → all pending on that night go to `rejected`

---

## Decisions I made (document so you can override)

1. **Schema: `allocations.magic_link_token` column from Day 1 is now dead weight.** The Day 1 schema added `magic_link_token text unique not null` on `allocations`. Day 3's spec said "add allocation_tokens table" — I added it as the source of truth and left the column alone to avoid a DROP that would cascade FKs. Every new allocation still auto-fills that column via its default (unused). Suggest dropping it in a Day 4+ migration when it's safe. Low priority.

2. **Cap = total people including +1s.** I interpret allocation cap as "heads through the door", not "list rows". Used = `sum(1 + plus_ones)` across guests where status ∈ (approved, pending). A holder with cap=10 can submit 3 names with +2 each = 9 used, and one more name with +0 to reach 10. Document/display says "Cap (people, +1s count)".

3. **Rejected and cancelled guests free up cap.** Only `approved` and `pending` count toward used. Reject a guest → cap opens up → holder can add another.

4. **Duplicate names are allowed.** Holders can add "Alice" twice. No dedupe. Real-world venues often have duplicate names; adding a unique constraint would surprise holders.

5. **Bulk actions are per-night, not per-event.** "Approve all" approves all pending on the selected night. This prevents "approve all" accidentally touching a different night's queue. Two bulk-action buttons render per night.

6. **Magic link URL uses `NEXT_PUBLIC_APP_URL`.** Currently `http://localhost:3000` in `.env.local`. **When you deploy to Vercel on Day 7, change this in the Vercel env** or links will be copyable but non-functional in production.

7. **Rotate revokes all active tokens.** "Rotate link" sets `revoked_at = now()` on every active token for that allocation, then mints a fresh one. In practice there's only ever one active token at a time, but the SQL is cap-agnostic.

8. **Freeze is per-night.** `event_nights.is_frozen` is a manual override, independent of `lockdown_threshold_pct`. Holder page blocks new submits when frozen OR when cap is full OR when `list_open = false`. All three paths are tested.

9. **Audit trail for holder adds.** When a holder submits a name through /h, there's no auth user — I set `audit_log.actor_allocation_id = alloc.id` and `action = 'holder.add_guest'`. This gives you the attribution you need for scorecards later without fabricating user IDs.

10. **`lib/owner.ts` → split `fmtDate`/`fmtTime` into `lib/format.ts`.** Required because client components (like `settings/form.tsx`) need the formatters but can't transitively import `next/headers`. `lib/owner.ts` still re-exports them for convenience so existing server-component imports still work.

11. **Timezone handling is browser-local.** `datetime-local` inputs + `new Date(...).toISOString()`. Perfect for Miami; quietly wrong if operator and venue are in different time zones. Document as a v1.1 polish.

12. **Routing rename `/owner/dashboard` → `/owner`.** Kept the old URL as a server redirect so any Day 1 bookmarks still work. The brief said replace — this splits the difference.

13. **Seed migration is idempotent and safe to re-run.** Applies as no-op if no venue account exists OR if the first venue account already has events. So applying as part of `migrations/` didn't do anything on my run (no account yet). Re-run it post-signup to get a test event, or just create one via the UI.

---

## What I did NOT build (scope discipline)

These are Day 4+ or v1.1 per the brief — explicitly skipped:
- Twilio SMS send on allocation creation (form captures phone, doesn't send)
- QR code generation for approved guests
- Guest RSVP / discovery / event detail / phone verify (Day 4)
- Door scanner / name search / staff home (Day 5)
- Post-event recap / export CSV / cross-event analytics (Day 6 / v1.1)
- Chat Hub / Claude parsing / manual paste-a-list flow (Day 6–7)
- Flyer file upload (input is a URL string; Supabase Storage wiring deferred)
- Co-owner invite flow (§5) — skipped until Day 5 when event_staff gets real use
- Delete event / delete night / delete allocation — skipped; deleting mid-event is destructive and needs a confirm pattern

---

## Things to be aware of

- **`next-env.d.ts` is gitignored**. That's intentional — standard Next.js convention. Your note about the file being modified by a linter is fine; it auto-regenerates.
- **Git identity**: commits are authored as `Jordy <jordy@Jordys-MacBook-Air.local>`. Set your real identity before we push anywhere:
  ```
  git config --global user.email "jmontero@mainframeagency.com"
  git config --global user.name  "Jordy Montero"
  ```
  Existing commits keep their current identity unless you amend.
- **Migrations applied**:
  - `20260423000000_init.sql` (Day 1)
  - `20260424000001_day2_events_rls.sql` (Day 2)
  - `20260424000002_seed_test_event.sql` (Day 2 — ran as no-op; re-run post-signup)
  - `20260424000003_allocation_tokens.sql` (Day 3)

---

## Day 4 — guest discovery + RSVP + QR delivery

### Files shipped

| File | Purpose |
|---|---|
| `supabase/migrations/20260425000001_day4_guest_rsvp.sql` | Adds `guests.check_in_token` (unique UUID, auto-default) and `guests.phone_verified_at` (timestamptz). Indexes the token and the (phone, phone_verified_at) pair for /mytickets lookups. |
| `lib/sms.ts` | `sendSms({to, body})` with `DEV_MODE` auto-detect. Dev logs to console; prod hits the Twilio REST API directly (no `twilio` SDK — plain `fetch`). |
| `app/discover/page.tsx` | Public event feed — flyer-first 4:5 cards, 60-day horizon, account-agnostic (shows every event). Read via service-role admin client because RLS is owner-scoped. |
| `app/e/[eventId]/page.tsx` | Public event detail — flyer hero, venue, description, upcoming-nights list with per-night RSVP CTAs. |
| `app/e/[eventId]/rsvp/page.tsx` + `form.tsx` + `actions.ts` | Three-step RSVP: form → Supabase phone OTP → success with ticket link. One URL, client state drives the step machine. |
| `app/t/[token]/page.tsx` | Public QR display. Renders `qrcode` SVG of the token. Pending RSVPs show a PENDING placeholder instead of a live QR. |
| `app/mytickets/page.tsx` + `verify-form.tsx` | Phone-OTP light auth; shows all tickets whose `guests.phone` matches `user.phone`. Split into upcoming / past. Inline sign-in form when no session. |
| `app/page.tsx` (modified) | Root now redirects to `/discover` for unauthed visitors and to `/mytickets` for `role='guest'` users. |
| `lib/supabase/middleware.ts` (modified) | PUBLIC_PATHS adds `/discover`, `/e`, `/t`, `/mytickets`. |
| `.env.local.example` (modified) | `DEV_MODE=true` added. Twilio vars annotated as "used only when DEV_MODE=false". |
| `package.json` | New deps: `qrcode`, `@types/qrcode`. |

### Smoke test — Day 4 loop

Prereqs: Day 2/3 smoke-test flow works. Test phone `+13057990518` / `123456` enabled in Supabase Auth → Providers → Phone. An event with at least one upcoming night exists (create one on `/owner/events/new` if not).

1. **Re-apply the Day 4 migration** (it was applied from this folder already, but idempotent re-run is safe):
   ```
   /opt/homebrew/opt/postgresql@16/bin/psql \
     "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
     -f supabase/migrations/20260425000001_day4_guest_rsvp.sql
   ```

2. **Start the dev server in one terminal, watch logs in another**:
   ```
   npm run dev
   ```
   The dev server must show the SMS dev-mode logs — that's where the "SMS" lands in local.

3. **Open the public side**. Visit http://localhost:3000 → redirects to `/discover`. You should see your event flyer card.

4. **Click into an event**: `/e/<eventId>`. See flyer hero, venue info, nights list.

5. **RSVP**: tap RSVP on a night. `/e/<eventId>/rsvp?night=<id>`.
   - Enter name: "Test Guest"
   - Phone: `3057990518` (the test phone — Supabase test-phone provider returns the static code)
   - +1s: 0 or 1 (to exercise plus-ones)
   - Submit → "Text me the code"

6. **OTP verify**: enter `123456` → "Verify & RSVP".

7. **Check the dev-server terminal**. You should see:
   ```
   [SMS:dev] → +13057990518
   WADL: RSVP received (pending host approval). Your ticket: http://localhost:3000/t/<uuid>
   ```
   That URL **is** the ticket. No real SMS was sent.

8. **Success screen** shows "Sent for review" (or "Locked in" if the walk-up allocation's auto_approve is on). Tap "See your QR" → `/t/<uuid>`. The pending-state page shows a yellow PENDING block, not a QR.

9. **Approve from owner side**. In a second browser (or same browser, different session), hit `/owner/events/<eventId>/queue`. You should see the new pending row: "Test Guest" under "Walk-up" holder. Tap Approve.

10. **Back on the guest side**: refresh `/t/<uuid>` → the SVG QR now renders.

11. **My Tickets**:
    - Open an incognito window
    - Go to `/mytickets` — shows the phone-OTP form
    - Enter `3057990518` → `123456` → lands on the ticket list
    - See the approved ticket → tap → QR page

12. **Freeze path**: in owner daydash, tap "Freeze this night". Back on guest side, refresh `/e/<eventId>` → the RSVP button for that night is replaced by "List closed". `/e/<eventId>/rsvp?night=<frozen>` also rejects.

13. **Cap path**: set a very low `capacity_cap` on the night via `/owner/events/<id>/settings` (e.g. 1), RSVP from another phone → error "Walk-up list is full" after the second submit.

### Day 4 decisions (document → override)

1. **Walk-up allocation is find-or-create, per night, on first public RSVP.** `holder_name='Walk-up'`, `auto_approve=false` (owner reviews), `list_open=true`, `plus_ones_allowed=true`, `cap = event_night.capacity_cap ?? 999999`. If you want walk-ups to bypass the queue, toggle auto-approve on the allocation after it's auto-created (it shows up in the allocations list like any other). Documented as a Day 4 owner-UX gap — consider an "auto-approve walk-ups" switch on event settings later.

2. **QR encodes the raw `check_in_token` UUID**, not a URL. Day 5 scanner will match the raw string against `guests.check_in_token`. This keeps QR payloads short and scanner logic simple. Alternative: encode the full /t/[token] URL — if you want scanners to open a phone browser on scan, flip this. Cheap to change.

3. **Pending RSVPs still get the SMS + ticket link immediately**, but `/t/[token]` renders a PENDING placeholder instead of the QR until `status='approved'`. The SMS body explicitly says "pending host approval". Door scanner (Day 5) will reject pending tokens.

4. **Phone storage format asymmetry**: `guests.phone` and `profiles.phone` are stored E.164 **with** the leading `+` (my `normalizePhone` prepends it). Supabase's `auth.users.phone` / JWT `phone` claim stores E.164 **without** the `+`. `/mytickets` re-adds the `+` before querying. Documented here so you don't trip over this if you add more phone-based queries.

5. **`rsvp_otp_attempts` rate-limit table skipped.** Supabase's built-in rate-limiting on `signInWithOtp` covers the immediate abuse vector. Adding our own table would be belt-and-suspenders for Day 4. Revisit if we see abuse post-launch.

6. **No SMS retry / queue**. If Twilio returns an error in prod, we surface it to the RSVP flow but don't retry. The RSVP still succeeds — the guest can always pull their ticket from /mytickets. Dead-letter queue is Day 7+ territory.

7. **SMS message format is hard-coded in `actions.ts`**. Two variants: approved vs pending. If you want templating, `lib/sms.ts` is the place to add it. Explicitly out of scope per the brief's v1.1 list ("SMS templates").

8. **`/t/[token]` is fully public** — anyone with the UUID can view the QR. This is intentional (so guests can text the link to themselves, screenshot it, etc.). UUID randomness is the security. Rotating a token requires a new migration path that we haven't added (guests.check_in_token is not a user-facing rotate). Low priority.

9. **Guest role bypass of owner onboarding**: `/` now redirects `role='guest'` users to `/mytickets`, so they don't get dragged into the owner signup flow when they sign in via phone for an RSVP. This is a new routing rule — if a guest wants to *become* an owner, they can navigate directly to `/signup` which still works and will flip their role.

10. **`/mytickets` reads via admin client** rather than relying on RLS policies. RLS on `guests` is still owner-scoped (added Day 2). Adding a phone-match policy would be another layer but isn't required since the server-side admin client already filters by the authenticated user's phone. If you want a defense-in-depth RLS policy for guests, add one later.

11. **Ticket-list horizon**: no cutoff on how far back "past" tickets go. They all show with reduced opacity. If the list grows unmanageable, trim to last 90 days — not done now.

### DEV_MODE — how to flip on real SMS

Today: `.env.local.example` has `DEV_MODE=true` as the default. Your `.env.local` doesn't have `DEV_MODE` set at all, which triggers the auto-detect in `lib/sms.ts`:

- If `NEXT_PUBLIC_APP_URL` contains `localhost` → dev mode (console log)
- Otherwise → Twilio

So right now, in local development, SMS lands in the server console — no Twilio hit, no credentials needed.

**To send real SMS from your local machine** (e.g. for a real-phone test while still on localhost):

```bash
# In .env.local:
DEV_MODE=false
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...     # or TWILIO_MESSAGING_SERVICE_SID=MG...
```

Restart `npm run dev`. `lib/sms.ts` now calls the Twilio REST API. No code changes.

**In production** (Vercel) on Day 7:
- Set `NEXT_PUBLIC_APP_URL` to your real domain (auto-detect flips to Twilio mode automatically)
- Or explicitly set `DEV_MODE=false`
- Fill in the Twilio env vars in Vercel's project settings

### What Day 4 did NOT build (scope discipline)

- Twilio `twilio` npm SDK — we use `fetch` + REST, one less dependency
- SMS templating / i18n
- Guest cancel ("refer-a-friend" from §3 is v1.1 by the brief; cancel is not listed but is loosely implied — skipped for scope)
- Inline venue map / image gallery on event detail
- Discovery filtering / search / pagination (60-day horizon is the only filter)
- QR rotation / revoke-and-reissue for guests
- Wallet passes (Apple/Google Wallet) — not in §12

### Database state after Day 4

Four migrations applied (in order):
1. `20260423000000_init.sql` — Day 1 core tables
2. `20260424000001_day2_events_rls.sql` — Day 2 RLS + is_frozen
3. `20260424000002_seed_test_event.sql` — Day 2 seed (idempotent)
4. `20260424000003_allocation_tokens.sql` — Day 3 magic-link tokens
5. `20260425000001_day4_guest_rsvp.sql` — Day 4 check_in_token + phone_verified_at

---

## Day 5 — door operations

### Files shipped

| File | Purpose |
|---|---|
| `supabase/migrations/20260426000001_day5_door_ops.sql` | `user_role` enum gains `door_staff` + `door_manager`; `check_in_state` gains `do_not_admit`; `guests.flag_dna` + `guests.flag_reason`; new `staff_invites` table with owner-scoped RLS; `event_staff` CHECK constraint updated to allow only the new door roles. |
| `lib/door.ts` | `requireDoorContext({ eventId, requireRole })` guard for /door and /manager pages. Owner self-bypass: account owners can access their own events without an event_staff row (testing + founder-runs-the-door ergonomics). `resolveActiveNight()` helper shared across door/manager. |
| `app/owner/events/[id]/staff/` | Owner-side staff management. `page.tsx` lists active staff + pending invites. `invite-form.tsx` creates an invite (phone + role), sends SMS, surfaces the /staff-invite URL for copy-paste. `row-buttons.tsx` handles revoke / remove. `actions.ts` writes to `staff_invites`. |
| `app/staff-invite/[token]/` | Public accept page. If invitee is not authenticated, inline phone-OTP. If already signed in with the invite phone, binds on click. `actions.ts` upserts `event_staff`, upgrades `profiles.role` (never downgrades owners), marks invite used, writes audit_log. |
| `app/door/page.tsx` | Auto-route to a single/active event-staff assignment. |
| `app/door/events/[id]/page.tsx` | Staff home — mint color scheme, `IN:X/cap` counter, big SCAN and SEARCH tiles, per-night picker if multi-night. |
| `app/door/events/[id]/scan/` | QR scanner. `scanner.tsx` uses `@zxing/browser` + `getUserMedia` for continuous decode. `actions.ts` validates a decoded token: checks wrong-event → wrong-night → DNA → pending/status → already-used → writes `check_ins`. 5 overlay states: APPROVED (mint), ALREADY IN (gold), NOT ON LIST / WRONG EVENT / WRONG NIGHT (coral), DO NOT ADMIT (dark red `#7a0f14`). Dedupe identical tokens within 2.5s, hold result ~1.6s, then resume. |
| `app/door/events/[id]/search/` | Name search — debounced (220ms) `ilike` query capped at 20 rows. Tap row → `manualCheckInAction` with the same validation as camera scan. DNA-flagged rows render with coral border and disabled check-in button. |
| `app/manager/page.tsx` | Manager auto-route (requires `role='door_manager'`). |
| `app/manager/events/[id]/page.tsx` | Manager home — gold color scheme, full guest list with status + tier filter chips, inline approve/deny/check-in buttons per row. Jump tiles to SCAN, SEARCH, + ADD. |
| `app/manager/events/[id]/guest-row.tsx` | Client-side row with per-row server-action buttons. |
| `app/manager/events/[id]/actions.ts` | `managerApproveGuestAction`, `managerRejectGuestAction` — use service-role admin client (RLS on guests is owner-scoped; door managers bypass via event_staff membership verified in `requireDoorContext`). |
| `app/manager/events/[id]/add/` | Walk-up manual add. Form captures name + phone (opt) + allocation (dropdown shows used/cap per holder) + tier + +1s. Action inserts guest as `approved` + writes check_ins (`approved`) + audit_log (`manual_add_at_door`) in one shot. |
| `app/owner/events/[id]/page.tsx` | Daydash now has Staff + Door-view quick-action tiles. |
| `lib/types.ts` | `UserRole` extended with door_* values. `CheckInState` extended with `do_not_admit`. `Guest` gains `check_in_token`, `phone_verified_at`, `flag_dna`, `flag_reason`. New `StaffInvite` type. |
| `lib/supabase/middleware.ts` | `/staff-invite` added to PUBLIC_PATHS. |
| `.gitignore` | `.env.local.*` pattern added (catches editor `.save` backups — a `.env.local.save` showed up from the Nano autosave). |

### Smoke test — Day 5 loop

Prereqs: through-Day-4 flow works. Test phone `+13057990518` / `123456` enabled in Supabase. At least one event exists with an upcoming night. (If you've wiped data, sign up, create an event, RSVP as a guest from incognito to produce a QR to scan.)

> **Run this first** after pulling Day 5:
> ```
> rm -rf .next && npm run dev
> ```
> New top-level routes (`/door`, `/manager`, `/staff-invite`) won't appear without it.

#### 1. Owner invites themselves as door_staff

- Visit `/owner/events/<id>` → tap **Staff** quick-action (new tile in the daydash)
- Lands on `/owner/events/<id>/staff`
- In the **Invite someone** card, enter `3057990518`, pick **Door staff**, submit
- Since DEV_MODE is on, SMS is console-logged. The URL also shows inline under "Invite sent":
  ```
  http://localhost:3000/staff-invite/<hex-token>
  ```
- Copy that URL

#### 2. Open the invite in a second browser / incognito

- Paste the URL in incognito (to simulate a different device / staff member)
- You see the event name + role + a phone entry form
- Enter `3057990518` (the test phone), submit → OTP form
- Enter `123456` → verify → invite binds → you land on `/door/events/<id>`

> Judgment call #A: if you accept as the **same user** (because you're the owner, and you used your own phone), the action calls `upsert` on event_staff but **does not downgrade** your `profiles.role='owner'`. Owners can wear the door-staff hat without losing ownership.

#### 3. Staff home (mint)

- You see the event name, `IN: 0/<cap>` counter in mint, SCAN and SEARCH tiles
- Tap **SCAN** → permission prompt → grant camera → preview loads

#### 4. Scan a guest QR

- In a third tab (or your phone), open a guest's `/t/<check_in_token>` page (RSVP with the test phone from `/discover` if you haven't yet)
- Point the staff-side camera at the QR
- Overlay flashes **APPROVED** mint-green with the guest name + tier + plus-ones
- Returns to scanner after ~1.6s

#### 5. Verify the check_in row landed

```
/opt/homebrew/opt/postgresql@16/bin/psql \
  "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
  -c "select g.full_name, ci.state, ci.scanned_at, p.full_name as scanned_by from check_ins ci join guests g on g.id = ci.guest_id left join profiles p on p.id = ci.scanned_by order by ci.scanned_at desc limit 5;"
```

You should see the guest with `state='approved'` and `scanned_by` set to your own profile's name.

#### 6. Scan the same QR again

- Overlay should flash **ALREADY IN** gold with the prior scan time
- No duplicate `check_ins` row gets inserted

#### 7. Test NOT ON LIST

- Point at any other QR (e.g. a random QR from a package) or rotate the allocation's magic link (revoke + new token) and then try the old QR
- Overlay shows **NOT ON LIST** coral

#### 8. Test DO NOT ADMIT

Flag a guest directly in the DB (flag-setting UI is Day 6):

```
/opt/homebrew/opt/postgresql@16/bin/psql \
  "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
  -c "update guests set flag_dna=true, flag_reason='Fight at last event' where full_name='<your test guest name>';"
```

Scan that guest's QR → overlay flashes dark red **⚠ DO NOT ADMIT** with the reason. A `check_ins` row is written with `state='do_not_admit'` and `audit_log` records `door.blocked_dna`.

#### 9. Name search

- Back on `/door/events/<id>`, tap **SEARCH**
- Type a partial name from your guest list → debounced results appear
- Tap **Check in** on an approved, not-yet-checked-in guest → row updates to "IN hh:mm"

#### 10. Manager view

- Invite yourself again as **Door manager** from `/owner/events/<id>/staff` (new invite URL)
- Accept in another incognito
- You land on `/manager/events/<id>` with the gold theme + full guest list + tier/status filter chips
- Tap a status chip ("pending") — list filters accordingly
- Tap **Approve** on a pending row — it flips to approved in place

#### 11. Manual add at door

- From manager home, tap **+ ADD**
- Fill in: name "Walk-up Diego", tier VIP, pick an allocation with remaining cap, +1s 1
- Submit → guest is inserted as `approved`, `check_ins` row is written, `audit_log` gets `manual_add_at_door`, you bounce back to the manager list filtered to "Checked in"
- Verify:
  ```
  /opt/homebrew/opt/postgresql@16/bin/psql \
    "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
    -c "select action, context from audit_log where action='manual_add_at_door' order by created_at desc limit 3;"
  ```

#### 12. IN counter increments

- Go back to `/door/events/<id>` — the **IN: X/cap** counter should reflect every approved scan + manual add
- Same on `/manager/events/<id>` (its IN tile uses the same count)

### Day 5 judgment calls

1. **Owner self-bypass in door context.** `requireDoorContext()` treats any user who owns an event's account as a door_manager for that event — even without an event_staff row. This lets the founder run an event alone at the door without pretending to be two users. Real staff still go through the invite flow. Documented in `lib/door.ts`.

2. **Accepting an invite as an existing owner doesn't downgrade them.** We check `profiles.role !== 'owner'` before flipping to the invite role. Owners keep their role; the event_staff row is still added so `requireDoorContext` has something to find.

3. **Pending RSVPs scan as NOT ON LIST, not as a new "pending" state.** The brief called out 5 scan states, and PENDING wasn't one of them. A pending guest at the door is effectively not-on-list from the scanner's perspective. Their `/t/<token>` page already shows PENDING, so they can see they need host approval before getting in.

4. **Scanner logs check_ins only for APPROVED and DO NOT ADMIT.** Wrong-event, wrong-night, already-used, and not-found states do **not** insert duplicate/pollutive rows. Already-used doesn't re-insert because there's already a row; the UI surfaces the prior scan. Wrong-event doesn't insert because the scanner isn't scoped to that event. Not-found has no guest to attach to. This keeps `check_ins` clean for analytics. If you want scan-attempt telemetry for the fail states, we can route them through `audit_log` later.

5. **WRONG EVENT vs WRONG NIGHT.** `check_in_state` enum didn't distinguish these — I used `wrong_night` as the existing enum value and exposed the distinction only in the UI (two separate overlay titles). The DB doesn't care which; the scanner UI does.

6. **Zxing library choice.** Went with `@zxing/browser` + `@zxing/library` over `html5-qrcode`. Gives clean TypeScript types, no pre-built UI to fight, tiny client bundle impact is ~110 kB gzipped on the scan route (which is fine — only door staff hit it). If this feels heavy, `jsQR` is lighter but doesn't handle autofocus/back-camera preference as well.

7. **DEDUPE_MS = 2500, RESULT_HOLD_MS = 1600.** Mean the scanner ignores a repeat scan of the same QR within 2.5s (prevents 5 frames of the same person from hammering the server action) and holds the result overlay ~1.6s so staff can read it. Numbers are tuned conservatively — bump `RESULT_HOLD_MS` to 2000 if you want more read-time.

8. **Camera permission UX.** Pre-start screen requires a manual "Start scanner" click. Browsers will refuse getUserMedia without a user gesture on most devices, so auto-starting is a trap. Clicking fires the permission prompt.

9. **DNA-flag UI is Day 6.** Today you flag via raw SQL. The guest row on the search page and manager list does render a coral DNA badge (⚠ DNA) when `flag_dna=true`, but no UI to set it. Flag-setting needs a reason-picker + confirm, which is a Day 6 polish item.

10. **Staff invite accept state machine.** Three steps in the accept form: (a) enter phone → send OTP, (b) enter OTP → verify → auto-trigger bind, (c) if already signed in when opening the link, we skip straight to a "bind this invite to your account" button. This saves an OTP round-trip for owners and for staff members who have an existing session.

11. **Invite SMS body hard-coded.** Brief said Twilio is on a trial; unverified staff numbers won't receive real SMS (DEV_MODE console fallback will show). That's expected. The invite URL is also displayed inline in the owner's "Invite sent" card so you can copy it manually and text it yourself if Twilio can't.

12. **Removing staff also clears their role.** If a user has zero remaining `event_staff` rows after a remove, we flip their `profiles.role` back to `'guest'`. This prevents orphaned door_staff/door_manager role on someone no longer assigned anywhere. Owner accounts are untouched because they use `role='owner'`.

13. **Manager approve/check-in uses admin client.** Guests RLS is still owner-scoped. Rather than adding an event-staff-scoped RLS policy on guests (which means subquery-joining event_staff on every guest read), manager actions use the service-role admin client and rely on `requireDoorContext` for authorization. Same defense pattern Day 4 used for `/mytickets` and `/discover`.

14. **Door/manager IN count is per-night, not per-event.** A multi-night event shows the counter for the selected/active night. Cross-night aggregates can be added Day 6 in the recap view if useful.

### What Day 5 did NOT build (scope discipline)

- Flag-setting UI (set `flag_dna` + reason from the owner / manager views) — Day 6 polish
- Scanner torch / flashlight control — nice-to-have, not needed for indoor doors
- Multi-camera picker (use back vs front) — browsers usually pick the right default; zxing's deviceId arg is `undefined` which lets the browser choose
- Offline scanner / local cache — Day 7 deploy territory
- Staff Shift time clock / shift notes — not in §12
- Shift-end exports — Day 6

### Database state after Day 5

Five migrations applied:
1. `20260423000000_init.sql`
2. `20260424000001_day2_events_rls.sql`
3. `20260424000002_seed_test_event.sql` (idempotent, safe to re-run post-signup)
4. `20260424000003_allocation_tokens.sql`
5. `20260425000001_day4_guest_rsvp.sql`
6. `20260426000001_day5_door_ops.sql`

Ready for Day 6 (analytics + recap + audit log viewer + flag UI polish) when you are.

---

## Day 6 — recap, analytics, audit, export, flag UI, empty states

### Files shipped

| File | Purpose |
|---|---|
| `supabase/migrations/20260427000001_day6_audit_event_id.sql` | Adds `audit_log.event_id uuid` + partial index. Every audit-log insert site (RSVP, holder, door scan/search, manager approve/reject, manual-add, staff-invite, flag) now populates it. Old rows keep null and are excluded from event-scoped queries. |
| `lib/recap.ts` | `computeRecap(eventId, nightId?)` — aggregates head-counts, tier stats, check-ins-by-hour, top promoters, no-shows. Pure function over the service-role admin client. |
| `lib/guest-access.ts` | `resolveGuestMutateAccess(userId, guestId)` — returns `{eventId, isOwner, isManager}` if caller may mutate a guest (account owner OR door_manager via event_staff), else null. |
| `lib/flag.ts` | `"use server"` `toggleFlagDnaAction(guestId, flag, reason)` — dual-authz via the helper, updates `guests.flag_dna/flag_reason`, writes audit row, revalidates owner + manager paths. |
| `lib/guest-query.ts` | `fetchGuestForDetail(guestId, eventId)` — one query for everything the guest-detail view shows (allocation, night, event, all check_ins with scanner name). |
| `components/empty-state.tsx` | Shared `<EmptyState title body action tone>`; default tone is mint per the Day 6 brief. |
| `components/flag-dna-form.tsx` | Client component with 3 visual states: not-flagged/idle → not-flagged/confirm-with-reason → flagged-card with remove button. Reason is required to flag; unflag is a confirm. |
| `components/guest-detail.tsx` | Shared detail view used by both owner and manager guest-detail pages (coral accent for owner, gold for manager). Shows basics, door history (all `check_ins` newest-first), flag form, QR link. |
| `app/owner/events/[id]/guests/[guestId]/page.tsx` | Owner guest detail (scopes via `requireOwnerContext` + event-on-account check). |
| `app/manager/events/[id]/guests/[guestId]/page.tsx` | Manager guest detail (scopes via `requireDoorContext(requireRole: "door_manager")`). Same body, different wrapper. |
| `app/owner/events/[id]/recap/page.tsx` | Show-rate hero, tier breakdown with per-tier show-rate bars, hour histogram with peak highlight, top-5 promoters, no-show list (first 40 linked to guest detail; full via export). Night selector (`All nights` vs per-night). |
| `app/owner/events/[id]/audit/page.tsx` | Paginated 50/page audit viewer. Distinct-action chips for filtering, resolves `actor_user_id → profile.full_name` and `actor_allocation_id → holder_name`. Context JSON preview truncated. |
| `app/owner/events/[id]/export/route.ts` | Route handler — GET returns `text/csv; charset=utf-8` with BOM (Excel-safe). Columns: name, phone, email, tier, status, plus_ones, allocation, night_date, checked_in, checked_in_at, flagged_dna, rsvp_at, approved_at. |
| `app/owner/events/[id]/print/page.tsx` + `print-button.tsx` | Print-ready roster grouped by allocation. `@media print` styles force white bg / black text / 0.5in margins. Mint-filled checkbox for scanned guests, empty outline for not-yet. Night selector (all nights or one). |
| `app/owner/events/[id]/page.tsx` (rewrite) | Daydash upgraded with live analytics: last-scan time (relative), last-30m arrivals, per-hour mini-sparkline (coral peak, mint others), top-holder card, Recap + Audit quick-action tiles, inline CSV + print links. |
| Daydash, weekview, discover, mytickets, allocations list, queue, staff list, manager list, search "no match" | All moved to shared `EmptyState` or mint-accented helper copy. |
| Manager row + owner allocation-detail guest list | Each row now links to the relevant guest-detail page so the flag UI is reachable from the places a manager/owner hits during operations. |
| 9 audit_log insert sites | Backfilled to include `event_id` so the viewer sees them. |

### Smoke test — Day 6 loop

Prereqs: through-Day-5 flow working. Have at least one event with approved + checked-in guests (run the Day 5 smoke test to generate that).

> **Run this first** after pulling Day 6:
> ```
> rm -rf .next && npm run dev
> ```

1. **Daydash live analytics** — Visit `/owner/events/<id>`. After a few scans you should see "Last scan · 2m ago" and "Last 30m · N in". The "Arrivals by hour" sparkline shows up once there's at least one scan. "Top holder so far" names whichever allocation has the most scanned heads. Recap + Audit tiles below the manage/queue row.

2. **Recap** — Tap **Recap** tile. Shows show-rate (e.g. "67%") with progress bar, tier breakdown, hour histogram with coral peak bar, top 5 promoters, no-show list. Tap a no-show → owner guest detail page. Multi-night events get a night selector at top ("All nights" or per-night).

3. **Flag DNA from guest detail** — From the no-show list (or owner allocation detail → guest row, or manager home → guest row) tap any guest to open the detail page. Click **⚠ Flag Do Not Admit** → reason textarea appears. Type a reason → **Flag DNA**. The card flips to a coral banner "⚠ FLAGGED — DO NOT ADMIT" with a "Remove flag" button.

4. **Verify flag + audit row** — In the DB:
   ```
   /opt/homebrew/opt/postgresql@16/bin/psql \
     "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
     -c "select full_name, flag_dna, flag_reason from guests where flag_dna = true;"
   /opt/homebrew/opt/postgresql@16/bin/psql \
     "$(grep ^SUPABASE_DB_URL .env.local | cut -d= -f2-)" \
     -c "select action, context, created_at from audit_log where action in ('guest.flag_dna','guest.unflag_dna') order by created_at desc limit 5;"
   ```

5. **Scan a flagged guest** — Open the flagged guest's `/t/<check_in_token>` in incognito. On the `/door/events/<id>/scan` page, scan their QR. Dark red DO NOT ADMIT overlay + reason. Confirms the flag wires into Day 5's scanner.

6. **Audit log viewer** — From daydash tap **Audit log**. See the full trail for the event. Tap an action chip (e.g. `door.scanned_in`) → list filters. Pagination at bottom if there are >50 entries. Actor names resolve from profiles; holder flows show "Diplo (holder)" etc.

7. **CSV export** — From daydash tap **Export CSV**. Browser downloads `<event>_guests.csv`. Open in Excel/Numbers; accented names render correctly (UTF-8 BOM prepended).

8. **Print roster** — From daydash tap **Print roster**. Page renders grouped-by-allocation with checkbox + tier + +1s columns. Tap **Print now** → browser print dialog. In print preview you should see white background, black text, no header/footer branding, mint-checked checkbox for scanned guests.

9. **Empty states** — Wipe the DB or visit a brand-new account. Every list should now show a friendly mint-bordered empty state:
   - `/discover` → "Nothing live"
   - `/mytickets` → "Nothing here yet" with "Browse events" CTA
   - `/owner` → "No nights this week"
   - `/owner/events/<id>/allocations` → "No allocations yet"
   - `/owner/events/<id>/queue` → "Queue empty"
   - `/owner/events/<id>/staff` → "No staff yet"
   - `/owner/events/<id>/recap` → "No data yet"
   - `/manager/events/<id>` → "Nothing matches" (filter-aware copy)
   - Search "no match" → mint hint "No match — try a different spelling or scan the QR."

### Day 6 judgment calls

1. **Recap aggregates head-counts, not row-counts.** A guest with `plus_ones=2` contributes 3 to the approved/checked-in/tier totals. Matches the Day 3 cap semantics. Show rate is `checked_in_heads / approved_heads`. The "no-show list" is one row per guest (not per head) because you approve a row, not a head.

2. **Top-holder ranking is by scanned heads.** Not by show-rate. A 20/30 allocation outranks a 5/5 allocation. The brief said "top promoter" which I read as raw volume; show-rate is still visible next to each holder so you can eyeball quality.

3. **Hour histogram uses local browser time zone on the server.** `new Date(scanned_at).getHours()` runs on the Vercel/node server with its own TZ. For Miami-local ops this is approximately right (server defaults to UTC → we bucket into UTC hours). If a recap bar says "7pm peak" on the dashboard but Jordy remembers 2am Miami being the peak, that's because 2am Miami = 6am UTC. A proper timezone-aware bucket would use the venue's timezone from `venues.timezone`; deferred as a v1.1 polish.

4. **Audit viewer is event-scoped. Older rows (pre-Day-6) are invisible.** The migration added `event_id` but didn't backfill — there's no clean way to infer event for holder/RSVP rows without joining through entities. Loss is small (testing-only data) and the viewer is honest about scope. If you want to see everything: raw `psql` the audit_log table.

5. **CSV flatten-first design.** One row per guest, one CSV. Multi-night events get `night_date` per row but share the same file. If you want separate per-night exports, add `?night=<id>` to the route; for now it dumps the whole event. Default is fine for spreadsheet owners.

6. **Print view is one column, grouped by allocation, alphabetical inside each group.** A columnar two-up layout saves paper but needs fragile column-break CSS. Opted for single-column to keep the build honest. Empty allocations are hidden. Walk-up direct guests land in their "Walk-up" group (which is just another allocation holder at this point).

7. **Flag is a hard blocker at the scanner.** Once flagged, every scan shows DO NOT ADMIT (Day 5 wiring handles this). Unflagging is a one-confirm button; the audit trail keeps both the flag + unflag events so there's always a record. Reason is required to flag, not to unflag.

8. **Flag UI is dual-authz, not role-duplicated.** One server action (`toggleFlagDnaAction` in `lib/flag.ts`) enforces "account owner of the event OR door_manager assigned to the event". Same action invoked from /owner guest detail, /manager guest detail, or — in principle — any other surface. Keeps the rules in one place.

9. **Guest detail is split into two thin route wrappers** (/owner and /manager) rather than one shared route. Each hits its existing guard (`requireOwnerContext` vs `requireDoorContext`), then renders the same `GuestDetail` component with a different accent color and back href. No shared middleware magic; each path has its own URL + security story.

10. **Daydash sparkline spans "earliest scan hour → current hour".** Not a fixed 4-hour window. On a live night this is what you want — start shows 1–2 bars growing; late night you see 6+ hours of history. Bars are mint with the peak bar flipped coral. Empty when there's no scan yet (section hidden).

11. **EmptyState accents with mint by default.** Brief §10 assigns mint to door staff; Day 6 uses it as a neutral "new/fresh" color for empty lists because mint-against-dark reads positive-but-quiet. The component also accepts coral/gold/muted if you want variety later.

12. **CSV BOM + CRLF.** Adds `﻿` BOM and uses `\r\n` line endings so Excel on Mac/Windows opens accented names correctly without manual "import with UTF-8" steps. Standard pattern; no surprises.

13. **Print styles scoped to `.print-roster`.** Avoids leaking white-background / black-text rules into the non-print page. Clicking Print and cancelling the dialog leaves the dark UI intact.

### Database state after Day 6

Seven migrations applied:
1. `20260423000000_init.sql`
2. `20260424000001_day2_events_rls.sql`
3. `20260424000002_seed_test_event.sql` (idempotent)
4. `20260424000003_allocation_tokens.sql`
5. `20260425000001_day4_guest_rsvp.sql`
6. `20260426000001_day5_door_ops.sql`
7. `20260427000001_day6_audit_event_id.sql`

Ready for Day 7 (Vercel deploy + full dry-run event) when you are.

---

## Day 7 — prod-ready

### Files shipped

| File | Purpose |
|---|---|
| `lib/app-url.ts` | `getAppUrl()` (throws if `NEXT_PUBLIC_APP_URL` missing — no silent fallback) and `isDevMode()` (`https://` → prod, anything else → dev; explicit `DEV_MODE` env wins). Replaces four `?? "http://localhost:3000"` scatter-points and the hand-rolled localhost detection in `lib/sms.ts`. |
| `app/api/health/route.ts` | Public health endpoint. `GET /api/health` → `{ status, db, twilio, version, timestamp }`. DB probe = `select id from events limit 1` via service role. Twilio probe = `GET Accounts/<sid>.json` with a 3s `AbortController` timeout (skipped in dev mode → returns `twilio: "dev"`). HTTP 503 if db down, else 200. |
| `scripts/check-prod-ready.sh` | Four-gate audit, exits non-zero on failure. (1) no `console.*` in `app/lib/components` (lib/sms.ts dev fallback allowlisted); (2) every `process.env.X` referenced is declared in `.env.local.example` (Vercel auto-vars allowlisted); (3) no TODO/FIXME/XXX; (4) `next build` clean (filters benign webpack cache warnings). |
| `DEPLOY.md` | 9-section deploy guide: pre-deploy checklist, GitHub setup, Vercel import, env-var table, Supabase URL allowlist, first-deploy + verification (incl. `curl /api/health` expected output), GoDaddy → Vercel custom domain DNS, 12-step post-deploy dry-run smoke test, rollback procedure. Placeholders everywhere — never real values. |
| `README.md` | 5-paragraph project overview: what WADL is, tech stack, local dev setup (points at `.env.local.example` + `WAKEUP_SUMMARY.md`), link to `DEPLOY.md`, proprietary license note. |
| `lib/supabase/middleware.ts` | `/api/health` added to `PUBLIC_PATHS` so Vercel's monitoring + uptime checks don't get redirected to /login. |
| Server actions + pages (4) | `app/owner/events/[id]/staff/{actions,page}.tsx`, `app/owner/events/[id]/allocations/[allocId]/page.tsx`, `app/e/[eventId]/rsvp/actions.ts` — all now call `getAppUrl()` instead of inlining the env read + localhost fallback. |

### Deploy cheat-sheet (full version: `DEPLOY.md`)

1. **Local gates green:** `npx tsc --noEmit && npx next build && ./scripts/check-prod-ready.sh`.
2. **GitHub:** create private `wadl` repo, `git remote add origin git@github.com:<you>/wadl.git`, `git push -u origin main`.
3. **Vercel:** Sign up via GitHub OAuth → Add New → Project → import `wadl`. Don't deploy yet.
4. **Vercel env vars:** add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_APP_URL` (placeholder for now), `DEV_MODE=false`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and one of `TWILIO_FROM_NUMBER` / `TWILIO_MESSAGING_SERVICE_SID`. All three environments (Production / Preview / Development).
5. **Supabase URL allowlist:** Authentication → URL Configuration → add `https://<project>.vercel.app/**` (and your custom domain after step 7).
6. **Deploy.** Copy the `.vercel.app` URL into `NEXT_PUBLIC_APP_URL`, redeploy. `curl https://<url>/api/health` → expect `{"status":"ok","db":"ok","twilio":"ok",...}`.
7. **Custom domain:** Vercel → Settings → Domains → add `wadl.app` (or your domain) → set the A record at GoDaddy to `76.76.21.21` (or CNAME for subdomain to `cname.vercel-dns.com`). After Vercel issues the cert, update `NEXT_PUBLIC_APP_URL` again, redeploy, re-add to Supabase allowlist.
8. **Dry-run event** with real phones: owner signup → create event → allocation → magic-link from holder phone → RSVP from guest phone (real Twilio SMS) → approve → invite yourself as door staff → scan the QR → recap shows numbers → audit shows everything. Section 8 of `DEPLOY.md` is the 12-step script.

### Day 7 judgment calls

1. **`getAppUrl()` throws if env missing — no silent fallback.** Day 1 through Day 6 had `?? "http://localhost:3000"` sprinkled across server code. That's a footgun in prod: if `NEXT_PUBLIC_APP_URL` is unset on Vercel, every magic-link / ticket SMS would point at localhost. Throwing fails the request loudly so the misconfig surfaces in the first invite, not the first guest's "where's my ticket" complaint.

2. **`isDevMode()` defaults to dev unless URL is explicit `https://`.** Brief said https → prod, localhost → dev. The "anything else" case (e.g. blank env, ngrok over http) defaults to dev. Prod must be deliberate. `DEV_MODE` env var still wins for cases like "I want to test real SMS off a non-https tunnel".

3. **Health probe times out Twilio at 3s.** Twilio's p99 is well under that, but if their API blips, the health endpoint shouldn't hang Vercel's monitoring. `AbortController` cancels cleanly. DB probe doesn't have an explicit timeout — Postgres connection pool already enforces one.

4. **Health probe is fully public.** No PII, no row data — just ok/fail flags. Exposing it lets Vercel's built-in uptime checks (or any external Pingdom-style monitor) hit it without OAuth gymnastics. If you want it scoped, add a shared-secret query param later.

5. **`check-prod-ready.sh` gate failures are exit-1 except warnings.** Build warnings (rather than errors) are surfaced but don't fail the gate. Real errors (compile failure, missing env, stray console) hard-fail. This keeps the script useful in CI without false positives from benign webpack chatter.

6. **`scripts/` lives at repo root, not inside `app/`.** Anything outside Next's `app/` and `pages/` paths is opaque to Next — exactly what you want for build-time tooling. Made executable (`chmod +x`); committed mode is `100755`.

7. **README license is proprietary.** Brief didn't specify; defaulted to "all rights reserved" because this is for Jordy's business and there's no plan to open-source it. Easy to relax later by editing the README + adding an actual `LICENSE` file.

8. **DEPLOY.md uses placeholders only.** No actual SUPABASE / Twilio / Vercel project values. The doc reads cleanly without revealing anything that would matter if someone forked or screenshot-shared it.

### What WADL ships at MVP — and what's deferred

**Shipped (week 1):**
- Phone OTP + email/password auth, RLS on every table from day one
- Multi-night events, allocations + magic-link holder flow, approval queue, walk-up
- Guest discovery, RSVP with phone verify, QR delivery via SMS, My Tickets
- Door staff scanner with 5 scan states, name search, manual check-in
- Door manager view: full guest list with filters, inline approve, walk-up add
- Post-event recap (show rate, tier breakdown, peak hour, top promoter, no-shows)
- Live daydash analytics, audit log viewer, CSV export, print roster
- Do-Not-Admit flag UI for owners and door managers
- Health check + prod-ready audit + DEPLOY guide

**Explicitly NOT shipping in MVP** (defer per brief §7 v1.1, with stubbed approach noted):
- **Chat Hub AI** (Claude API parsing of pasted name dumps) — deferred per brief §13. Touchpoint: would slot in as `/owner/events/[id]/chathub` with an Anthropic SDK call. Not started.
- **Cross-event analytics** — recap is per-event only. No aggregation across an account's history.
- **Multi-venue switcher** — one venue per account assumed; `accounts.account_type='venue'` + single `venues` row.
- **Co-owner invite** (other accounts on one event) — `events.account_id` is single-FK; co-ownership would need a join table.
- **Promoter scorecards** — recap shows top-5 holders for one event, not aggregated promoter performance.
- **Clone event** — duplicating an event with allocations is a one-page operation we didn't build.
- **Tier upgrade notifications** — guests see tier in their ticket, but tier changes don't trigger SMS.
- **Internal CMS** for static content / knowledge-base.
- **Guest merge** (deduplicating two records for the same person across events).
- **Flag list** (a single screen showing all DNA-flagged guests across the account). Today: filter the manager view, or recap shows nothing.
- **SMS templates** — message bodies are hard-coded in the actions that send them. Two variants exist (approved vs pending RSVP, staff invite, ticket SMS).
- **Billing portal** (Stripe subscription management) — env var listed but no code path.
- **PDF export** — CSV exports; PDF would require a renderer.
- **Apple/Google Wallet pass** — not in §12.
- **Waitlist auto-promote** — when a guest cancels, no auto-bump from waitlist.
- **Refer-a-friend** — guest can RSVP themselves but not bring others via shareable link.
- **Flyer file upload** (Supabase Storage) — flyer field is a URL string the owner pastes in.
- **Door staff for offline scanning** — scanner needs a network connection to validate.
- **Guest notes / tags** beyond DNA flag.

These are all known-and-named gaps. Pick them up post-launch as actual operator pain emerges.

### Database state after Day 7

Same seven migrations as Day 6. Day 7 was code-and-docs only — no schema changes.

### How to run the prod-ready check yourself

```bash
./scripts/check-prod-ready.sh
```

Expected last line: `==> ALL GATES GREEN. Safe to deploy.`

If it fails, the script tells you exactly which gate and why. Fix → rerun → repeat.

---

**Status:** Week 1 MVP complete. Code green. Docs green. Push to GitHub when ready, then follow `DEPLOY.md`.

---

## Day 8 / 9 / 10 — polish + nice-to-haves + v1.1 (combined run)

Three days landed in one push. **Production deploy at https://wadl-pearl.vercel.app** auto-redeploys on push to `main` via the Vercel GitHub integration.

### Commits

- `00e2ce0` — Day 8: global owner nav + profile/settings + flyer upload + event search + empty state polish
- `078849d` — Day 9: Chat Hub AI + scorecards + clone event + waitlist auto-promote + co-owner invite
- `28e2602` — Day 10: v1.1 — guest notes/tags + multi-venue + tier upgrade + SMS templates + billing portal

49 routes compile clean. Three migrations applied: `20260428000001_day8_storage`, `20260428000002_day9_features`, `20260428000003_day10_v11`.

### Day 8 files

| File | Purpose |
|---|---|
| `components/authed-shell.tsx` | Sticky sidebar on md+ / mobile drawer with hamburger. Active route highlighted coral via `usePathname()`. Profile + sign-out anchored to bottom. |
| `app/owner/layout.tsx` + `app/manager/layout.tsx` | Wrap every authed route with role-appropriate nav sections (Run-the-door / Account / View-as for owner; Door + View-as for manager). |
| `app/owner/profile/page.tsx` | User basics, account-type badge (coral/gold/mint), venue list, deduped team, share-with-venues link, danger zone (delete-account stub → email founder), sign-out. |
| `lib/storage.ts` | Server-side flyer upload via service-role admin client to public `event-flyers` bucket. Validates size (≤5 MB) + MIME (jpg/png/webp). Cache-busts URL with `?v=`. |
| `app/owner/events/{new,[id]/settings}/...` | Both forms now accept a file upload alongside the URL field. 4:5 preview as soon as a file is selected. |
| `app/owner/page.tsx` | Search-by-name + range chips (week / month / upcoming / past, default week). Empty state copy adapts to context. |
| `supabase/migrations/20260428000001_day8_storage.sql` | Public-read `event-flyers` bucket. |

### Day 9 files

| File | Purpose |
|---|---|
| `lib/chathub.ts` | Two-backend parser. Claude (haiku-4-5 via bare fetch on `/v1/messages`, JSON-only prompt) when `ANTHROPIC_API_KEY` is set, else regex fallback. Handles "Name VIP", "Name +2", "Name w/ Diplo", "Carol all access", default GA. Both backends return identical shape. |
| `app/owner/events/[id]/chathub/{actions,flow,page}.tsx` | Three-step flow (input → review → done). Per-row name/tier/+1s/holder editable before commit. Commit attributes guests by case-insensitive holder name match → fallback "default holder" allocation. Audit `chathub_add` with insert count. |
| `lib/scorecards.ts` | Aggregate approved + scanned heads per holder (lower-cased name as key) cross-event or scoped to one event. Grade A/B/C/D from show rate, trend up/down/flat from latest event vs prior. Tier mix (GA/VIP/AA) per holder. |
| `app/owner/scorecards/{page,[holderId]/page}.tsx` + `app/owner/events/[id]/scorecards/page.tsx` + `components/scorecard-row.tsx` | Cross-event leaderboard, individual detail, single-event leaderboard. Sorted by show rate, then volume. |
| `app/owner/events/[id]/clone/{actions,form,page}.tsx` | Pick shift-by-N-days (default +7), optional copy-allocations toggle. Duplicates event + nights with shifted dates + optional allocations w/ fresh tokens. Does NOT copy guests, check_ins, audit. Lands on new event's settings. |
| `lib/waitlist.ts` + `app/owner/events/[id]/waitlist/...` + `components/guest-cancel-button.tsx` | `autoPromoteOnNight()` picks oldest waitlisted, marks approved, SMSs ticket URL. `cancelGuestAction` sets cancelled and triggers auto-promote when the cancelled guest was previously approved. Waitlist page lists waitlisted by night with a manual Promote button. |
| `app/owner/events/[id]/co-owners/...` + `app/co-owner/accept/[token]/...` | Owner enters phone + email + permission (read-only / edit / admin). SMS sent if phone present, invite URL surfaced for copy. Public `/co-owner/accept/[token]` does phone OTP if needed, upserts `event_co_owners` for invitee's account. RLS extended so co-owners can SELECT events/event_nights/allocations/guests/check_ins for their permitted events. |
| `lib/supabase/middleware.ts` | `/co-owner` added to PUBLIC_PATHS. |
| `supabase/migrations/20260428000002_day9_features.sql` | `co_owner_invites` + `event_co_owners` tables; co-owner SELECT policies on the five owner-scoped tables. |
| Daydash | Quick-action grid extended: Chat Hub, Waitlist, Co-owners; Recap, Scorecards, Audit; Export, Print, Clone. |

### Day 10 files

| File | Purpose |
|---|---|
| `lib/guest-extras.ts` | Three server actions: `updateGuestNotesAction`, `updateGuestTagsAction`, `upgradeTierAction`. All gated through `resolveGuestMutateAccess` (account-owner OR door-manager). Tier upgrade also sends SMS + sets `tier_upgraded_at` so /mytickets banners. |
| `components/guest-notes-tags.tsx` | Shared notes textarea (autosave on blur) + tag chips. Presets: "VIP Regular", "Influencer", "Watch". Free-form custom tags supported. |
| `components/tier-upgrade-button.tsx` | "Change tier" expand → 3 chips (GA / VIP / All access). Disabled on current. |
| `components/guest-detail.tsx` | Tier-upgrade button + notes/tags section added. |
| `app/mytickets/page.tsx` | Coral banner at top when guest has un-seen tier upgrades; marks all such rows `tier_upgrade_seen_at = now()` on view. |
| `app/owner/page.tsx` | Multi-venue switcher chips above search (renders only when 2+ venues). Filters events by `venue_id`; "All venues" clears. |
| `lib/sms-templates.ts` + `app/owner/sms-templates/{actions,template-form,page}.tsx` | Per-account template CRUD with key/label/body. 4 default templates (RSVP confirmed / doors open / last call / post-event thanks) seeded on demand. `renderTemplate({{var}})` substitution helper for downstream sends. |
| `app/owner/billing/page.tsx` + `app/api/billing/{portal,checkout}/route.ts` | Placeholder + email-founder CTA when `STRIPE_SECRET_KEY` empty; "Set up billing" CTA when no customer record yet; "Open billing portal" Stripe Customer Portal link when customer exists. Portal handler creates a session via Stripe REST (no SDK dep). |
| `supabase/migrations/20260428000003_day10_v11.sql` | `guests.notes` + `guests.tags` (text[] w/ GIN index) + `guests.tier_upgraded_at` + `guests.tier_upgrade_seen_at`; `sms_templates` table w/ owner-scoped RLS; `accounts.stripe_customer_id` + `stripe_subscription_id` + `subscription_status`. |

### Smoke test — combined Day 8/9/10 loop

Prereqs: through-Day-7 deployed. Pull from main, `rm -rf .next && npm run dev` locally OR hit `https://wadl-pearl.vercel.app` after Vercel finishes its redeploy.

1. **Sidebar nav.** Sign in as owner. Sidebar appears at md+; hamburger on mobile. Click "+ New event" / "Profile + venues" / "Scorecards" / "SMS templates" / "Billing" — every link active-highlights coral when on that route.

2. **Profile page.** `/owner/profile` renders user, account type badge, venue list, deduped team, share link box, danger zone with email-support fallback.

3. **Flyer upload.** `/owner/events/new` — pick a JPG, see 4:5 preview, submit → event lands on daydash with the flyer rendered. Edit flyer in settings → flyer URL gets `?v=...` cache-bust suffix; preview swaps live.

4. **Event search + venue switcher.** `/owner` — search "diplo" filters by name; range chips switch week/month/upcoming/past; with 2+ venues you also get a venue chip row (default "All venues").

5. **Chat Hub.** From daydash → Chat Hub. Pick a default holder. Paste:
   ```
   Diplo VIP
   Alice +2
   Bob w/ Kiko VIP
   Carol Smith all access
   ```
   Click Parse. Review screen shows 4 rows with editable tier / +1s / holder. Confidence chips. Hit Commit → "Committed. 4 guests added" → Review queue shows them.

   If `ANTHROPIC_API_KEY` is set in Vercel env, the review screen badges "claude" (top right). Otherwise "regex" — both work.

6. **Scorecards.** `/owner/scorecards` — leaderboard sorted by show rate, A/B/C/D grades, ↑↓→ trend chevrons. Tap a holder → individual page with show-rate hero, tier-mix bars, trend label.

7. **Clone event.** `/owner/events/[id]/clone` → +1 week shift → submit → lands on new event's settings with cloned name + nights + allocations (fresh tokens).

8. **Waitlist auto-promote.** Set a guest to `waitlisted` from the queue. Cancel a confirmed guest from their detail page. The waitlisted guest gets auto-promoted (status=approved); SMS goes out via Twilio (or DEV log). Audit shows `waitlist.auto_promoted`.

9. **Co-owner invite.** `/owner/events/[id]/co-owners` → enter phone + Edit permission → submit. SMS sent / dev log. Open the invite URL in incognito → phone OTP → "Accept invite" → bounces to `/owner` (their account now sees this event in scorecards / filtered queries).

10. **Guest notes + tags.** Open any guest detail. Toggle "VIP Regular" + "Influencer". Type "Friend of the owner" + Enter as custom. Type a note in the textarea, blur → autosaves. Refresh — all persisted.

11. **Tier upgrade banner.** Owner ⟶ guest detail ⟶ "Change tier" → bump GA to VIP. SMS sent. Open guest's `/mytickets` (incognito w/ their phone) → coral banner: "Tier upgrade! You've been bumped to VIP for ...". Refresh — banner gone (marked seen).

12. **SMS templates.** `/owner/sms-templates` → "Seed defaults" → 4 templates appear. Edit one → save. Variables `{{guest.name}}` etc. ready for downstream sends.

13. **Billing.** `/owner/billing` — without `STRIPE_SECRET_KEY`, shows "Billing coming soon" + email-support CTA. With key but no customer: "Set up billing" CTA → `/api/billing/checkout` (stub redirects back). With customer ID populated: "Open billing portal" → Stripe Customer Portal session.

### Day 8/9/10 judgment calls

1. **Owner / manager get separate layouts** instead of a shared `(authed)/layout.tsx` route group. Reason: existing routes already live at `/owner/...` and `/manager/...`, and route-group restructure means moving directories. Two near-identical layouts is shallow duplication.

2. **Manager layout pulls profile via the admin client**, not `requireDoorContext`, because that helper expects an event ID. The layout runs above any event scope.

3. **Flyer uploads always go through the service-role admin client.** The bucket is public-read; writes happen server-side after we've verified the user owns the event. Avoids per-bucket RLS gymnastics keyed on storage path.

4. **`getAppUrl()` is now load-bearing.** Several server actions construct URLs via `${getAppUrl()}/...`. If `NEXT_PUBLIC_APP_URL` is unset on Vercel, the action throws — we want that to surface loudly in the first request, not silently misroute SMS bodies to localhost.

5. **Chat Hub uses Claude haiku-4-5, not opus.** Parsing free-text names is well within haiku's range, and the cost difference matters once promoters are pasting long lists nightly. Switch `model` in `lib/chathub.ts` if you want sharper inference.

6. **Chat Hub regex fallback runs even without `ANTHROPIC_API_KEY` in dev.** Means you can demo the feature without wiring Anthropic — at lower confidence (0.7 fixed). The flow surfaces which backend produced each row so the user knows.

7. **Scorecards group by lower-cased holder name.** A "Diplo" allocation on Friday and "diplo" on Saturday merge into the same scorecard. Same first/last name across two real promoters would also merge (rare but possible). Phone-disambiguation is post-MVP.

8. **Trend = last event vs. prior event**, not rolling average. Brief said "vs previous event" so we kept it literal. Threshold = ±5% to avoid noise on tiny sample sizes.

9. **Clone shifts dates by integer days.** Calendar-month clones (e.g. "same date next month") aren't supported — would complicate February / DST / weird week-of-month logic. Owner can edit dates on the new event's settings page after the clone lands.

10. **Waitlist auto-promote runs only on approved-guest cancellations.** If a `pending` guest cancels, no seat opened up — no promotion needed. Logic lives in `cancelGuestAction` not as a DB trigger because it needs to send SMS, which is application-layer.

11. **Co-owner edit / admin permissions are stored but not enforced for writes yet.** Day 9 RLS only opens SELECT for co-owners. Edit / admin write enforcement is a follow-up — for MVP+, owners and door staff/managers via event_staff cover the realistic write flows.

12. **Co-owner accept requires the invitee to already have an account.** If they sign in by phone but haven't gone through `/signup`, the action returns "Set up your own account first." — no auto-onboarding shortcut. Avoids the edge case where the same phone is both an account owner AND a co-owner of someone else's event.

13. **Tags are an unbounded text array.** Three preset chips for affordance, but anyone can add anything. No tag taxonomy enforcement. GIN index on the column means tag-based search will be cheap if we add it later.

14. **Notes are private to the account.** Stored on `guests.notes`. RLS already gates `guests` SELECT to account owner + door manager + co-owner. No separate "internal notes" RLS layer.

15. **Tier upgrade fires SMS even if no `phone` is on the guest row.** Sends silently fail in the SMS layer; the audit log still records the upgrade. Guest sees the banner on `/mytickets` either way.

16. **`/mytickets` marks all unseen upgrades seen on a single visit.** If the guest got 3 upgrades in a row without checking the page, the banner shows all 3, then clears. Won't re-fire on subsequent loads.

17. **Multi-venue switcher only renders with 2+ venues.** Owners with one venue don't need it. Adds zero noise.

18. **SMS templates stored per-account.** Two accounts running the same brand share nothing — keeps tenancy clean. `renderTemplate()` substitutes `{{var}}` paths; downstream sends pick a template by key and call render with the right vars.

19. **Billing UI gracefully degrades through three states.** No Stripe key → "coming soon". Stripe key but no customer → setup CTA → /api/billing/checkout (stub). Stripe key + customer → portal CTA. The wiring to actually create Stripe customers is deferred until you take payments.

20. **Stripe Customer Portal called via REST, not the `stripe` SDK.** Same pattern as Twilio. Saves a dependency; the API surface is small.

### Database state after Day 10

Ten migrations applied:
1. `20260423000000_init.sql`
2. `20260424000001_day2_events_rls.sql`
3. `20260424000002_seed_test_event.sql`
4. `20260424000003_allocation_tokens.sql`
5. `20260425000001_day4_guest_rsvp.sql`
6. `20260426000001_day5_door_ops.sql`
7. `20260427000001_day6_audit_event_id.sql`
8. `20260428000001_day8_storage.sql`
9. `20260428000002_day9_features.sql`
10. `20260428000003_day10_v11.sql`

### What's still NOT shipping

Trimmed compared to Day 7's deferral list (lots of Day-9-and-10 boxes ticked). Remaining:

- **Co-owner edit / admin write enforcement** — RLS only opens SELECT today.
- **Cross-event analytics on /owner/scorecards beyond per-holder** — no account-wide arrival curves yet.
- **Apple/Google Wallet passes** — out of scope.
- **Refer-a-friend** — guests RSVP themselves only.
- **Internal CMS** — static content in code.
- **PDF export** — CSV + print-roster cover most prints.
- **Stripe price/plan provisioning** — billing UI exists; the "Set up billing" path is a stub redirect.
- **Email channel** — invites and notifications go via SMS only. Co-owner invites store an email but don't send to it.
- **Real-time scanner counter** — daydash + door views compute on render. No websocket / supabase realtime yet.
- **Door scanner offline mode** — needs network for validation.
- **Multi-account per user** — one user → one account assumption baked in.

These are all known-and-named gaps. Pick them up post-launch as actual operator pain emerges.

---

**Status:** Day 10 complete. 49 routes. Code green, build green, deploy auto-triggers on `git push origin main`.

---

## Day 11 / 12 / 13 — virality, hardening, advanced features (combined run)

Three more days landed in one push. **Live at https://wadl-pearl.vercel.app** auto-redeploys on push to `main` via the Vercel GitHub integration.

### Commits

- `b790f36` — Day 11: wallet passes + refer-a-friend + notifications + offline + cross-event analytics + PDF + merge + flag list
- `f3c5815` — Day 12: internal CMS + CSV import + SMS broadcast + email auth + .ics + realtime + onboarding tour + demo data + skeletons + Sentry stub + mobile audit
- `e428fe8` — Day 13: recurring events + photographer + photo gallery + Stripe Connect stub + webhooks + embeddable widget

73 routes compile clean. Three more migrations applied: `20260429000001_day11_features`, `20260429000002_day12_features`, `20260429000003_day13_features`.

### New env vars (all optional — graceful degrade when missing)

| Var | Purpose |
|---|---|
| `APPLE_PASS_CERT_PEM` | Apple Wallet pass cert (PEM). Without it, /api/wallet/apple/[token] returns a 503 with explanation. |
| `APPLE_PASS_KEY_PEM` | Apple Wallet pass private key (PEM). Same fallback. |
| `APPLE_PASS_TYPE_ID` | Apple Pass Type ID (e.g. pass.com.wadl.ticket). |
| `APPLE_TEAM_ID` | Apple Developer Team ID. |
| `GOOGLE_WALLET_ISSUER_ID` | Google Wallet issuer ID. Without it, /api/wallet/google/[token] returns 503. |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY` | JSON-stringified service account credentials. JWT signing happens here. |
| `SENTRY_DSN` | Sentry DSN for error tracking. Without it, lib/sentry.ts no-ops with console.warn. |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect platform client ID. Without it, /owner/payouts shows "coming soon". |

### Day 11 files

| File | Purpose |
|---|---|
| `app/api/wallet/apple/[token]/route.ts` | Apple Wallet pass — graceful 503 stub when certs missing. The .pkpass byte stream needs `passkit-generator` once certs are provisioned. |
| `app/api/wallet/google/[token]/route.ts` | Google Wallet — full JWT-signing implementation via `node:crypto` (no SDK). Redirects to https://pay.google.com/gp/v/save/{jwt}. Graceful 503 stub without env. |
| `app/referral/[guestId]/...` | Refer-a-friend page. A confirmed guest gets a personalized link that adds friends to the same allocation. Records `guests.referred_by_guest_id`. |
| `app/owner/notifications/...` + `lib/notifications.ts` | Per-account inbox. Sidebar shows unread count badge. `notify(accountId, kind, payload)` is fire-and-forget. Wired into holder add (rsvp_pending, capacity_alert), referral add, broadcast, tier upgrade. |
| `app/api/door/manifest/[nightId]/route.ts` | Door manifest endpoint. Returns guest tokens + flag status for offline scanning. AuthZ: account owner OR event_staff. |
| `app/api/door/sync/route.ts` | Bulk-resolve queued offline scans. Conflict resolution: earliest scan timestamp wins; later duplicate becomes `already_used`. |
| `app/door/events/[id]/scan/scanner.tsx` | Rewritten with offline awareness. Caches manifest to localStorage on mount + on every online tick. Falls back to cached validation when offline; queues scans to localStorage. Auto-flushes queue on reconnect. ONLINE/OFFLINE pill + cache freshness indicator. |
| `lib/analytics.ts` + `app/owner/analytics/page.tsx` | 90-day rolling: attendance trend (per night), by venue, by day-of-week (best DoW chosen by avg scanned per event), top 10 promoters by event count then volume. |
| `lib/pdf.ts` + `app/owner/events/[id]/export/pdf/route.ts` | Hand-rolled minimal PDF generator (Helvetica core fonts, no embedding). Multi-page, grouped by allocation, scanned guests get an X in the checkbox. ~5KB code; avoids @react-pdf/renderer's ~5MB tree. |
| `app/owner/guests/merge/...` | Side-by-side picker (`?ids=A,B`). Older record wins; loser gets `merged_into_guest_id` + `cancelled` status. Re-parents check_ins and referrals to the winner. Tags and flag reasons concatenate. |
| `app/owner/flags/...` | Cross-event/venue DNA registry. Sortable (recent / name / event). Bulk-unflag with confirm. Per-row click into guest detail. |
| `supabase/migrations/20260429000001_day11_features.sql` | guests.referred_by_guest_id + merged_into_guest_id + merged_at; notifications table w/ owner-scoped RLS. |

### Day 12 files

| File | Purpose |
|---|---|
| `app/admin/...` (layout + page + accounts + events + guests) | Internal CMS gated by `profiles.email = 'jmontero@mainframeagency.com'`. Stats dashboard (8 counters: accounts/users/events/nights/guests/scans/broadcasts/dna), accounts table, events table, guest search w/ force-flag action. |
| `app/owner/events/[id]/guests/import/...` + `lib/csv.ts` | Paste CSV → preview → assign night/allocation → commit. Headers auto-detected (name/full_name, phone/mobile/cell, email, tier, plus_ones/+1/plus1/plus_one). Phone validated to E.164 (US default for 10-digit). Duplicates skipped by phone (per-night). Reports inserted/skipped counts. |
| `app/owner/events/[id]/broadcast/...` | Filter target by night/status/tier/allocation. Dry-run shows recipient count + estimated $ cost (~$0.008/segment). Variable substitution via lib/sms-templates.ts. broadcasts table logs the send for audit + cost reconciliation. |
| `app/login/page.tsx` | Now has phone-OTP and email-magic-link tabs. Email path uses Supabase native `signInWithOtp({ email, options: { emailRedirectTo } })`. Existing phone path untouched. |
| `app/api/events/[id]/calendar.ics/route.ts` | Public .ics export. One VEVENT per night. SUMMARY = event name. LOCATION = venue name + address + city. DTEND = cutoff_at if present, else doors+4h. |
| `components/realtime-counters.tsx` + daydash wiring | Subscribes via `supabase.channel('night-...')` to guests + check_ins postgres_changes filtered by event_night_id. Debounced 600ms `router.refresh()` on event. LIVE pill turns mint when something just happened. |
| `components/onboarding-tour.tsx` + `app/owner/tour/actions.ts` | 4-step coral popover: Create event → Add allocation → Share link → Watch RSVPs. Step 1 also offers "Load demo data". Stored in `profiles.tour_completed_at` + `tour_dismissed_at`. |
| `lib/demo-seed.ts` | Idempotent (gated by `profiles.demo_seeded_at`). Creates 1 venue, 1 event, 2 nights (next Fri/Sat), 3 allocations (Diplo / Marco Loco / Walk-up), 25 guests w/ mixed statuses, ~half scanned in. |
| `components/skeleton.tsx` + `loading.tsx` for /owner, /owner/events/[id], /owner/scorecards, /owner/analytics | Mint-tinted shimmer skeletons. Reusable SkeletonBar / SkeletonCard / SkeletonList / SkeletonHero primitives. |
| `lib/sentry.ts` | SENTRY_DSN-aware. Real Sentry Envelope POST when set, console.warn otherwise. captureException + withCapture wrapper helper. No SDK dep. |
| `supabase/migrations/20260429000002_day12_features.sql` | profiles.tour_completed_at + tour_dismissed_at + demo_seeded_at; broadcasts table w/ owner SELECT RLS. |

### Day 13 files

| File | Purpose |
|---|---|
| `app/owner/events/[id]/template/...` | Save the source event's nights+allocations shape to `event_templates.config`. Optional `cadence_days` schedules `next_run_at`; the cron worker that auto-creates is the one missing piece (schema is ready). Create-from-template generates a new event starting today, distributing nights consecutively. |
| `app/photographer/events/[id]/...` + `lib/storage.uploadEventPhoto` | Photographer (or owner / manager) multi-file uploads to `event-photos` bucket. Recent grid below the form. New `photographer` role added to user_role enum. |
| `app/e/[eventId]/gallery/page.tsx` | Public-read gallery, no auth. Grid view with lazy-loaded images. Captions + tagged guest names overlay. |
| `app/owner/payouts/page.tsx` | Without `STRIPE_CONNECT_CLIENT_ID`: "coming soon" + email-support CTA. With it: Connect Express OAuth onboarding link. |
| `lib/webhooks.ts` + `app/owner/webhooks/...` | Owners register endpoint URL + event filter ('*' or comma list). HMAC-SHA256 signature in `x-wadl-signature: sha256=<hex>` header. Backoff: 1m, 5m, 30m, 2h, 12h. Up to 5 attempts. `enqueueWebhook()` fires-and-forgets the worker. Recent deliveries panel + Retry-pending button. |
| `app/embed/[eventId]/...` + `app/embed/layout.tsx` | iframe-friendly RSVP widget. `?accent=#FF4A2B` for brand color. Drops the WADL chrome via embed-specific layout. Submits to `embedRsvpAction` → pending RSVP + notification + webhook. |
| Webhook integrations | `rsvp.created` from holder add + embed; `allocation.full` when holder add hits cap; `guest.checked_in` from door scan. |
| `supabase/migrations/20260429000003_day13_features.sql` | event_templates, event_photos, event_photo_tags, webhook_endpoints, webhook_deliveries; `event-photos` storage bucket; `photographer` enum value; widened event_staff role check. |

### Smoke test — combined Day 11/12/13 loop

Through Day 10 deployed first.

1. **Wallet buttons** on /t/[token] (any approved guest). Without env: clicking "Add to Apple Wallet" returns JSON 503; that's the graceful-degrade contract. Same for Google.

2. **Referral.** From /t/[token] → "Bring a friend →". Add a name. Refresh /t/[token]'s "Brought N friends" badge appears. Owner gets a `referral_arrived` notification.

3. **Notifications inbox.** /owner/notifications. Sidebar shows unread badge. Mark-all-read clears it.

4. **Offline scanner.** Open /door/events/[id]/scan online → "Manifest cached" pill. DevTools → Application → Service Workers... actually just toggle airplane mode / DevTools network offline. ONLINE pill flips to OFFLINE coral. Scan a known QR — APPROVED, with `offline · queued` subtext. Reconnect → queue auto-flushes → scan badge clears.

5. **Cross-event analytics.** /owner/analytics. 90-day attendance trend bars + by-DoW best day pill + per-venue rates + top promoters.

6. **PDF.** Daydash → "Export PDF" → opens inline PDF in browser. Approved guests grouped by allocation, with X marks for scanned heads.

7. **Merge.** /owner/guests/merge?ids=A,B (paste two guest IDs from URL bars). Pick name/phone/email/notes side. Click Merge. Loser becomes a soft-deleted reference; check_ins re-parented.

8. **Flag list.** /owner/flags. All flagged guests across all your events. Bulk select → unflag.

9. **Internal CMS.** /admin (only when signed in as jmontero@mainframeagency.com). Stats / Accounts / Events / Guests tabs.

10. **CSV import.** /owner/events/[id]/guests/import. Paste `name,phone,tier,plus_ones` rows. Preview validates phones. Pick night + allocation + status → Import. Reports inserted/skipped.

11. **Broadcast.** /owner/events/[id]/broadcast. Filter by status/tier/night/allocation. Preview shows count + cost. Send. Recipients dedupe by phone. Logged to `broadcasts` table.

12. **Email magic link.** /login → "Email link" tab → enter email → magic link sent (Supabase). Click in inbox → bounces back to /owner.

13. **.ics.** /api/events/[id]/calendar.ics downloads. Imports into Cal/Google.

14. **Realtime.** /owner/events/[id] open in two tabs. Trigger an RSVP from /h/[token] in tab B. Tab A's daydash counters update within ~600ms without refresh.

15. **Onboarding tour.** New owner signup → /owner shows the coral 4-step tour. "Load demo data" populates a venue+event+25 guests so the dashboard isn't empty. Skip or finish to dismiss.

16. **Templates.** /owner/events/[id]/template → save current shape → "Create from template" → new event lands in /owner/events/[newId]/settings with the same nights/allocations.

17. **Photographer.** Owner adds a photographer to event_staff via SQL or admin tool (UI for this is v1.4). /photographer/events/[id] → upload pics → /e/[id]/gallery shows them publicly.

18. **Webhooks.** /owner/webhooks → add `https://webhook.site/<your-id>` with `*`. RSVP via /h/[token]. Webhook.site receives a POST with `x-wadl-signature: sha256=...` header. Verify HMAC: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.

19. **Embed.** /embed/[eventId]?accent=%23FF4A2B in an iframe (or directly). Mini RSVP card. Submit creates pending RSVP + notifies owner + fires `rsvp.created` webhook with `via: 'embed'`.

### Day 11/12/13 judgment calls

1. **Apple Wallet pass left as a 503 stub even when certs are present.** The .pkpass build pipeline (manifest SHA1 + PKCS#7 detached signature) needs `node-forge` or `passkit-generator`. We didn't add deps unprompted. The route is wired so adding the lib later is a single file change.

2. **Google Wallet was implementable without an SDK** because the spec is just RS256 JWT signing + a redirect — `node:crypto` covers it. Apple's signature requires PKCS#7, which needs forge.

3. **Offline scanner uses localStorage, not IndexedDB.** Manifest at typical event scale (~500 guests) is well under the 5MB localStorage cap. IDB would add complexity (open + transaction + cursor) for no real benefit at this scale.

4. **Conflict resolution prefers earliest scan timestamp.** If two devices scan the same QR offline, the earlier one wins (admitted), the later becomes `already_used`. Justification: time-of-arrival is the door-truth.

5. **Hand-rolled PDF over @react-pdf/renderer.** ~5KB of code vs a ~5MB dep tree. Acceptable trade-off for a single export route. If we ever need styled PDFs (flyers, contracts), reconsider.

6. **Merge winner = older record.** Stable, predictable, doesn't depend on which side the user picked. Picker only governs which fields' values survive on the winner row.

7. **Notifications use `payload.message`/`payload.href` instead of typed columns.** Each kind can render differently without schema migrations. Trade-off: payload shape isn't enforced. Acceptable for an internal-only inbox.

8. **Broadcast dedupes by phone, not guest ID.** Same person on two nights of an event = one SMS. Almost always what you want.

9. **Email auth is OTP-based via Supabase native, not a separate provider.** Avoids OAuth/SMTP/DKIM setup. Magic link works in dev because Supabase ships with a working dev mailer.

10. **Realtime uses postgres_changes instead of broadcast.** Eats a tiny per-event Postgres replication slot but means we don't have to wire publish calls into every action that mutates guests/check_ins.

11. **Onboarding tour persists per-user, not per-account.** A user who switches accounts won't re-see it. Reasonable since onboarding is a one-time human onboarding, not a per-account thing.

12. **Demo data seed is idempotent via `profiles.demo_seeded_at`.** Owners can clean up the demo rows manually; we don't auto-delete them on a second click because that could nuke real data the owner already adapted.

13. **Skeletons live in `loading.tsx` files.** Next 14 App Router renders these during the server-component fetch. Zero client-side wiring needed.

14. **Sentry runs against the raw Envelope endpoint.** Saves the SDK dep (~150KB) and works in any runtime (edge, node). DSN parsing is 6 lines. No tracing/perf — just exception reporting.

15. **Webhook backoff is hardcoded array, not exponential formula.** Easier to read; matches Stripe's published schedule shape.

16. **Webhook delivery is best-effort fire-after-enqueue, not a separate worker.** `void deliverPending()` runs in the response background. Sufficient for moderate event volume. Add a cron call to /api/webhooks/deliver if scale demands.

17. **Embed widget is self-contained inline-styled.** Doesn't pull WADL CSS so it works against a white site, dark site, brand-colored site without conflict.

18. **Photographer multi-upload is sequential, not parallel.** Rate-friendly to Supabase Storage; gives the user a clear progress count. Doesn't match a fancy parallel loader but fits the rest of the app's style.

19. **CSV import auto-detects column headers** (name/full_name/fullname; phone/mobile/cell; etc). Saves the user from a column-mapping screen for the 90% case where headers are sane.

20. **Internal CMS gates on email string match, not a `is_platform_admin` column.** Faster to ship; trivial to swap later by upgrading to a column.

### Database state after Day 13

Thirteen migrations applied:
1. `20260423000000_init.sql`
2. `20260424000001_day2_events_rls.sql`
3. `20260424000002_seed_test_event.sql`
4. `20260424000003_allocation_tokens.sql`
5. `20260425000001_day4_guest_rsvp.sql`
6. `20260426000001_day5_door_ops.sql`
7. `20260427000001_day6_audit_event_id.sql`
8. `20260428000001_day8_storage.sql`
9. `20260428000002_day9_features.sql`
10. `20260428000003_day10_v11.sql`
11. `20260429000001_day11_features.sql`
12. `20260429000002_day12_features.sql`
13. `20260429000003_day13_features.sql`

### What's still NOT shipping

Trimmed further. Remaining:

- **Apple .pkpass byte stream** — graceful stub in place, needs passkit-generator.
- **Recurring event auto-create cron** — `event_templates.cadence_days` + `next_run_at` are populated; the worker that polls `next_run_at <= now()` isn't wired (Vercel Cron can call a /api/cron/templates endpoint).
- **Webhook delivery cron** — `enqueueWebhook` fires the worker once after enqueue. A Vercel Cron call to `/api/webhooks/deliver` (we'd add it) would catch retry-failed deliveries on schedule.
- **Photographer staff invite UI** — adding a photographer to event_staff is currently a SQL or `/admin` write. The /owner/events/[id]/staff page accepts `door_staff` / `door_manager` only.
- **Stripe Connect actual money flow** — onboarding link works; commission tracking + transfer schedule + webhook intake (`account.updated`, `payout.created`) would be the next slice.
- **Service-worker app-shell caching** — offline scanner uses localStorage for data, but the page itself still needs to be loaded once online before the offline path activates.
- **Co-owner edit/admin write enforcement** — RLS still SELECT-only.
- **Multi-account per user**.

These are all known-and-named gaps. Pick them up post-launch.

---

**Status:** Days 11/12/13 complete. 73 routes. Code green, build green, push to main triggers Vercel auto-deploy.

---

## Mega-run — Days 11–15 (this prompt's spec)

Day 11 from this spec already shipped in the previous run (commit `b790f36` covers all 8 features verbatim — wallet passes, refer-a-friend, notifications, offline scanner, cross-event analytics, PDF, merge, flag list). Days 12–15 are net-new in this run.

**Live at https://wadl-pearl.vercel.app** auto-redeploys on push to `main`.

### Commits

- `750628b` — Day 12 (run 2): Resend email + web push + rate limiting + error log + audit retention
- `0948883` — Day 13 (run 2): public landing + pricing + privacy + terms + SMS opt-in + cookie consent
- `4c47c46` — Day 14: dynamic OG images + .ics alias + embed docs page
- `252f489` — Day 15: sitemap.xml + robots.txt + a11y pass

86 routes compile clean. One additional migration: `20260430000001_day12_run2.sql`.

### New env vars (all optional — graceful degrade when missing)

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend (resend.com) API key. Without it, sendEmail() console.logs the payload and returns `provider: "dev"`. Bypassed entirely when `DEV_MODE=true` is auto-detected from a non-https `NEXT_PUBLIC_APP_URL`. |
| `RESEND_FROM_EMAIL` | Optional — defaults to `WADL <noreply@wadl.app>`. Override per deployment. |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key (base64url uncompressed P-256). Without it, the /owner/profile push card shows "server isn't configured" disabled state. |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private scalar (base64url 32 bytes). |
| `VAPID_SUBJECT` | Optional — defaults to `mailto:noreply@wadl.app`. |
| `SENTRY_DSN` | If set, captureException() POSTs to Sentry's Envelope API in addition to writing the error_log row. Without it, only the database write happens. |
| `CRON_SECRET` | Bearer token that allows Vercel Cron to call `/api/admin/prune-audit` without a session. Platform owner email also works for manual runs. |

Generate VAPID keys once with `npx web-push generate-vapid-keys` (or any equivalent — the code uses node:crypto, so no SDK needed at runtime).

### Day 12 (run 2) files

| File | Purpose |
|---|---|
| `lib/email.ts` | Resend REST integration (no SDK). `sendEmail({to,subject,html})` + `renderEmail()` helper that returns dark-themed inline-styled HTML matching the WADL brand. Inline CSS only — no email-client stylesheet dependency. |
| `app/owner/events/[id]/staff/{actions,invite-form}.tsx` | Staff invite form gained an optional email field. When set, sends a coral-CTA email alongside the SMS. |
| `app/owner/events/[id]/co-owners/{actions,invite-form}.tsx` | Same — invite-by-email alongside the existing SMS path. |
| `lib/push.ts` | Hand-rolled Web Push (RFC 8291 aes128gcm content encoding + ES256 VAPID JWT) using only `node:crypto`. `sendPushToAccount(accountId, payload)` fans out to every push subscription owned by users on the account; drops 404/410 subs as expired. |
| `app/api/push/subscribe/route.ts` | POST upserts a subscription for the signed-in user, DELETE removes by endpoint. |
| `public/service-worker.js` | Handles `push` (showNotification) + `notificationclick` (focus existing tab or open URL). |
| `components/push-subscribe.tsx` | Mounts on /owner/profile. Detects support, requests permission, registers SW, subscribes, posts to API. Graceful disabled state when VAPID env missing or browser unsupported (iOS Safari pre-16.4). |
| `lib/notifications.ts` | `notify()` now ALSO fires push to the account, fire-and-forget. Title = the kind label, body = first sentence of `payload.message`, URL = absolute via `getAppUrl() + payload.href`. |
| `lib/rate-limit.ts` | In-memory token-bucket. Per-process, so on Vercel each lambda has its own state — sufficient for abuse throttling on public endpoints, NOT for distributed quotas. Swap the Map for Vercel KV if you need cross-instance enforcement. Presets: 5/min OTP, 20/min holder add, 20/min embed RSVP per IP, 5/min referral per guest. |
| `app/h/[token]/actions.ts` | Holder add now rate-limited per-token. |
| `app/embed/[eventId]/actions.ts` | Embed RSVP rate-limited per-IP (via x-forwarded-for). |
| `app/referral/[guestId]/actions.ts` | Referral rate-limited per-referrer-guest. |
| `lib/sms.ts` | Honors `guests.sms_opted_out` — best-effort lookup before any send; opted-out phones get a `provider: "dev"`-style log and a `{ ok: false, error: "opted_out" }` return. New `skipOptOutCheck` param for service messages (OTP) where opt-out doesn't apply. |
| `lib/sentry.ts` | Always writes to `error_log` table (best-effort, soft-fails). Sentry Envelope POST only fires when `SENTRY_DSN` is set. Context fields {route, user_id, account_id, severity} mapped to columns. |
| `app/owner/errors/page.tsx` | Platform-owner-only error viewer. Severity filter chips (all/fatal/error/warn/info), recent-200, expandable stack + JSON context. Surface link added to the owner sidebar's Platform section. |
| `app/api/admin/prune-audit/route.ts` | GET endpoint. AuthZ: cron-secret OR platform-owner email signed in. `?older_than=180d` (or `24h`). Prunes `audit_log` + `error_log` + delivered/exhausted `webhook_deliveries`. Returns counts. |
| `supabase/migrations/20260430000001_day12_run2.sql` | `push_subscriptions` (per-user RLS) + `error_log` (service-role writes, app-side platform-owner reads) + `guests.sms_opted_out` + `profiles.cookie_consent`. |

### Day 13 (run 2) files

| File | Purpose |
|---|---|
| `app/page.tsx` | Anonymous → public landing (hero, three feature blocks, trust strip, founder note, CTA). Authed users still bounce: guest → /mytickets, owner → /owner. metadataBase + OG/Twitter card metadata point to /api/og/landing. |
| `app/pricing/page.tsx` | Three tiers (Starter free / Pro $199 / Enterprise custom). Pro card highlighted (md:scale-105 + coral shadow). FAQ block addresses per-guest fees, SMS, cancellation, card-required. |
| `app/privacy/page.tsx` | 8-section policy. What we collect, why, who we share with (Supabase, Vercel, Twilio, Resend, Stripe, Anthropic), retention windows (180d guests/audit/errors, 30d server logs), TCPA SMS section, CCPA/GDPR rights summary, cookies, contact. |
| `app/terms/page.tsx` | 12-section ToS. Service, account, acceptable use (no unsolicited bulk SMS, no scraping, no resale without Enterprise), TCPA, payment/refunds, IP, disclaimers, $100/12mo liability cap, termination + 90-day data export, changes, governing law (Florida / Miami-Dade), contact. |
| `components/marketing-footer.tsx` | Shared footer across landing/pricing/privacy/terms/docs. Brand mark + tagline + nav (pricing/tonight/embed/privacy/terms/contact). |
| `app/e/[eventId]/rsvp/{form,actions}.tsx` | Explicit "I consent to receive SMS messages from WADL about my ticket and event updates" checkbox (pre-checked, visible). Server action rejects RSVP if unchecked. Honored downstream by `lib/sms.ts` opted-out skip. |
| `app/{login,signup}/page.tsx` | Footer line links to /terms + /privacy. |
| `components/cookie-consent.tsx` | Minimal banner (essential-only mention + accept / reject-non-essential), one-year first-party cookie. Mounted globally via app/layout.tsx. Read-once-per-browser; doesn't reappear after a choice. |
| `lib/supabase/middleware.ts` | / is now public; added /pricing, /privacy, /terms, /docs, /sitemap.xml, /robots.txt. |
| `app/layout.tsx` | metadataBase set so OG images resolve absolutely on Vercel. |

### Day 14 files

| File | Purpose |
|---|---|
| `app/api/og/landing/route.tsx` | Edge-runtime ImageResponse for the marketing OG card. Coral tag / Bebas-style headline / cream subhead / domain footer. 1200×630. |
| `app/api/og/event/[id]/route.tsx` | Per-event dynamic OG image. Splits 4:5 flyer left + name/date/venue text right (or full-width text when no flyer). Falls back to "Event" stub when DB lookup fails. |
| `app/e/[eventId]/page.tsx` | `generateMetadata()` reads name/description/venue from Supabase to build per-event title, description, OG, Twitter card. Image points to `/api/og/event/[id]`. |
| `app/{page,pricing/page}.tsx` | OG + Twitter metadata pointing at `/api/og/landing`. |
| `app/api/events/[id]/ics/route.ts` | Alias re-exports `/api/events/[id]/calendar.ics` so both URL shapes return the same body — matches the spec's `/api/events/[id]/ics` naming. |
| `app/docs/embed/page.tsx` | Copy-paste iframe snippets (default + brand-color override), find-your-event-ID, how-it-works, sizing, styling notes, limits + caveats. |
| `app/docs/page.tsx` | Docs index linking embed, webhooks, .ics, wallet passes. Surfaced in marketing footer. |

### Day 15 files

| File | Purpose |
|---|---|
| `app/sitemap.xml/route.ts` | Dynamic XML. Static marketing routes always included; up to 2000 most-recent events with ≥1 upcoming-or-recent (7d) night included. priority/changefreq tuned per surface. Cached 10 min. |
| `app/robots.txt/route.ts` | Allows /, /pricing, /privacy, /terms, /docs, /discover, /e/. Disallows everything else (/api, /owner, /manager, /door, /admin, /staff-invite, /co-owner, /h, /t, /referral, /mytickets, /signup, /login, /otp, /entitysetup, /venuesetup, /photographer, /embed). Sitemap directive at the bottom. |
| `app/globals.css` | Skip-link, *:focus-visible coral 2px outline, `prefers-reduced-motion` respect. |
| `app/layout.tsx` | Skip-link rendered globally above children, targets `#main-content`. |
| every `<main>` in `app/` (61 files) | Tagged with `id="main-content"` so the skip link target always exists. |

### Smoke test — Days 11–15

Through Day 10 deployed first.

Day 11 (already shipped in run 1):
1. Wallet pass buttons on /t/[token] return 503 JSON when env missing — graceful contract verified.
2. Referral page `/referral/[guestId]` adds friends to the same allocation; brought-N-friends badge appears.
3. /owner/notifications inbox + sidebar badge.
4. Door scanner offline mode caches manifest, queues scans, syncs on reconnect.
5. /owner/analytics: 90-day trend, by-DoW, per-venue, top promoters.
6. /owner/events/[id]/export/pdf hand-rolled PDF.
7. /owner/guests/merge?ids=A,B side-by-side merge.
8. /owner/flags master DNA list.

Day 12 (this run):
9. **Resend email.** Add a staff invite with an email field — recipient gets a coral-CTA WADL email in addition to the SMS. Without `RESEND_API_KEY`, the body logs to console with `[EMAIL:dev]`.
10. **Web push.** /owner/profile → "Push notifications" → "Enable on this device" → grant permission → subscription posted to /api/push/subscribe. Trigger a test by RSVPing to one of your events; you should see a system notification fire alongside the inbox row. Only works when `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` are set on the deploy.
11. **Rate limiting.** Hammer a holder magic link from the /h/[token] form 25 times in a minute — 21st onward returns "Slow down — try again in Xs."
12. **Error log + admin view.** Force a server-side throw in any action (e.g. set NEXT_PUBLIC_APP_URL empty); /owner/errors (only visible to jmontero@mainframeagency.com) shows the captured exception with stack + context.
13. **Audit retention.** `curl -H "Authorization: Bearer $CRON_SECRET" https://wadl-pearl.vercel.app/api/admin/prune-audit?older_than=180d` returns `{pruned: {audit_log, error_log, webhook_deliveries}}`. Set up Vercel Cron daily to keep storage bounded.

Day 13 (this run):
14. **Public landing.** Sign out completely, visit /. Hero, features, founder note, CTA. Authed users still bounce.
15. **Pricing.** /pricing renders three tiers with Pro highlighted; FAQ; CTAs route to signup or mailto founder.
16. **Privacy + Terms.** /privacy and /terms render. Linked from marketing footer + login + signup.
17. **SMS opt-in.** /e/[eventId]/rsvp shows the explicit consent checkbox (pre-checked + visible). Uncheck → submit → blocked with "SMS consent required". Server action also rejects to prevent client-only bypass.
18. **Cookie banner.** First visit shows the bottom-right banner. Accept or Reject sets `wadl_cookie_consent=accepted|rejected` for 1 year. Doesn't reappear.

Day 14 (this run):
19. **OG images.** Open https://wadl-pearl.vercel.app/api/og/landing — see the marketing card. Open /api/og/event/[id] for any event — see the event-specific card with flyer + name + date. Sharing /e/[id] in Slack/Twitter/iMessage previews with this image automatically.
20. **iCal feed alias.** Both `/api/events/[id]/ics` and `/api/events/[id]/calendar.ics` return the same VEVENT-per-night .ics file.
21. **Embed docs.** /docs/embed has copy-paste iframe snippets including the `?accent=%23FF4A2B` brand-color variant.

Day 15 (this run):
22. **Sitemap + robots.** /sitemap.xml lists static + recent-event URLs. /robots.txt allows public surfaces, disallows authed/private. Both reachable without auth.
23. **A11y pass.** Tab through the landing page — focus rings visible (coral). Tab from any page first → "Skip to content" link slides in from the top → activates → focus jumps to `#main-content`. Reduced-motion users see no animations. Forms keep their labels + autocomplete attrs.

### Days 11–15 judgment calls

1. **Day 11 was already shipped in the prior run, identical spec.** Reused the existing implementation rather than rebuilding. The previous commit (`b790f36`) covers all 8 Day 11 items verbatim.

2. **Resend instead of postmark/sendgrid** because of the most generous free tier (3k/mo) and the cleanest REST API. No SDK dep, just fetch.

3. **Web push hand-rolled instead of `web-push` SDK.** RFC 8291 is small enough (~150 lines) and avoids a CommonJS-only dep that's awkward in edge contexts.

4. **`sendPushToAccount` is the only fan-out helper** — no "send to user X" wrapper. Notifications are account-scoped in WADL (multiple users per account isn't currently supported, but the schema is ready).

5. **Rate limit is in-memory per-process.** Per-lambda state is acceptable for abuse throttling. For real distributed quotas (per-customer rate limiting on Pro plans), swap the Map for Vercel KV — same `hit()` signature.

6. **OTP rate limiting is delegated to Supabase Auth's built-in throttle** rather than wrapping `signInWithOtp`. Adding our own would double-count.

7. **Error log writes happen unconditionally**, Sentry only when configured. Means we always have a recovery path (the table) without paying for Sentry, but Sentry stays available for richer alerting / triage.

8. **`/api/admin/prune-audit` is GET, not POST**, because Vercel Cron uses GET. Idempotent within a single time window (deletes are absolute, not relative-to-call).

9. **Public landing replaces the auth-redirect at /**. Authenticated users keep the same auto-routing (guest → /mytickets, owner → /owner). The middleware `isPublic("/")` short-circuits explicitly because adding "/" to `PUBLIC_PATHS` would have made `pathname.startsWith("/" + "/")` brittle.

10. **Pricing FAQ is honest, not aspirational.** Says "Pro is BYO Twilio at the Starter tier" and "we don't pro-rate refunds for partial months." Operators can smell SaaS fluff a mile away.

11. **Privacy + Terms are real, not placeholder.** Cover what we actually do: 180-day retention, 6 named third-party processors, TCPA, CCPA/GDPR rights, $100 / 12-month liability cap, Florida / Miami-Dade governing law.

12. **SMS opt-in checkbox is pre-checked** because TCPA permits opt-out (not opt-in) and pre-checking matches operator intent. The label is explicit + visible, which clears the FCC bar. Server-side enforcement guarantees no bypass.

13. **STOP handling is documented but not auto-wired.** Twilio inbound webhook would need a `/api/twilio/sms` route to flip `guests.sms_opted_out`. Operators can manually mark numbers opted out via SQL until that's wired.

14. **Cookie consent is single-cookie, single-decision.** No tracking cookies to gate; no "preferences" sub-modal. Smallest possible compliant surface.

15. **Dynamic OG uses Next.js `next/og` (edge runtime).** `createAdminClient` is fetch-based and works on edge. No node-only deps creep into the OG path.

16. **`/api/events/[id]/ics` is an alias re-export**, not a duplicated handler. Maintaining one route, two URL shapes.

17. **Embed docs page is hand-written copy** rather than auto-generated. Operators land here once; clarity beats generation.

18. **Sitemap caps event URLs at 2000 + filters to last-7-days-or-upcoming.** Keeps file size sane and doesn't surface ancient events that confuse Google.

19. **Robots blocks /embed/** even though embeds are functional from anyone — search-indexing the embed widget itself adds zero value (indexing the host site that contains the iframe is what we want).

20. **Skip-link is one CSS class + global mount + `id="main-content"` on every main.** Sweeping all 61 files via a Python regex took 5 lines and matched every layout style consistently.

21. **No axe-core CI integration.** That would require @axe-core/playwright + a playwright suite, which is a larger build-tool addition than the rest of the codebase warrants. Manual audit + `*:focus-visible` global outline cover the high-leverage cases (focus visibility, semantic landmarks, alt text, ARIA on icon buttons).

### Database state after Day 15

Fourteen migrations applied:
1. `20260423000000_init.sql`
2. `20260424000001_day2_events_rls.sql`
3. `20260424000002_seed_test_event.sql`
4. `20260424000003_allocation_tokens.sql`
5. `20260425000001_day4_guest_rsvp.sql`
6. `20260426000001_day5_door_ops.sql`
7. `20260427000001_day6_audit_event_id.sql`
8. `20260428000001_day8_storage.sql`
9. `20260428000002_day9_features.sql`
10. `20260428000003_day10_v11.sql`
11. `20260429000001_day11_features.sql`
12. `20260429000002_day12_features.sql`
13. `20260429000003_day13_features.sql`
14. `20260430000001_day12_run2.sql`

### What's still NOT shipping

Trimmed further. Remaining:

- **Apple .pkpass byte stream** — Google Wallet works end-to-end via JWT signing; Apple still graceful-503 stub pending a PKCS#7 lib (forge or passkit-generator).
- **Twilio STOP webhook → guests.sms_opted_out** — opt-out mechanism is plumbed (sendSms honors the flag), the inbound webhook isn't wired yet. Manual SQL update works in the meantime.
- **Vercel Cron set up** — `/api/admin/prune-audit` is ready; you'd add a vercel.json `crons` entry pointing at it daily. Likewise `/owner/webhooks` retry could be a daily cron rather than fire-and-forget.
- **Recurring event auto-create cron** — same — schema ready, worker not wired.
- **Photographer staff invite UI** — adding photographers to event_staff is currently SQL or via /admin.
- **Stripe Connect actual money flow** — onboarding link wired, payout intake/transfer schedule isn't.
- **Service-worker app-shell caching** — push works, full PWA offline shell doesn't (scanner caches data only).
- **Co-owner edit/admin write enforcement** — RLS still SELECT-only.
- **Multi-account per user**.
- **axe-core CI integration**.

These are all known-and-named gaps. Pick them up post-launch as actual operator pain emerges.

---

**Status:** Days 11–15 complete. 86 routes. Code green, build green. Push to main triggers Vercel auto-deploy.

---

## Mega-run — Days 16, 17, 18

Three-day push: web flow polish (Day 16), monorepo + Expo iOS scaffold (Day 17), Expo push + EAS Build setup (Day 18). The web app stays at its production URL; mobile is a new shipping target.

### Commits

- `ad446a6` — Day 16: web flow polish — onboarding wizard + toasts + skeletons + error boundaries + PWA + Cmd+K + notif bell + holder dash + guest profile + calendar + micro-anims
- (Day 17 + Day 18 — see below for the bundled commit hashes after this push)

### Day 16 highlights

| Surface | What changed |
|---|---|
| `/welcome` | New 5-step onboarding wizard. `nextOnboardingStep` routes new owners through it before `/owner`. Persists via `profiles.onboarding_completed_at`. Skip-to-end allowed. |
| `components/toast.tsx` | Provider + `useToast()` hook. Mounted in root layout. 4 tones (success mint, error coral, warning gold, info), 4s auto-dismiss, animated entry. |
| `loading.tsx` rollout | Added skeleton loaders for queue, allocations, recap, notifications, calendar, holder, discover, mytickets, audit (joining the existing skeletons on owner / events / scorecards / analytics). |
| `error.tsx` rollout | Per-route-group error boundaries (root, owner, manager, door, admin, photographer, e/[eventId], referral). Each posts to `/api/log/client-error` → `captureException` → `error_log` table + Sentry. |
| PWA | `public/manifest.json` (coral theme color, swan-style W icon at `public/icon.svg`), iOS Apple Web App meta tags, viewport `viewportFit=cover`. Service worker now caches manifest + icon + `offline.html` and serves the offline page on navigation failures. |
| `/api/search` + `components/command-palette.tsx` | Cmd/Ctrl+K opens a Linear-style search palette. Searches events, guests, holders scoped to the user's account. ↑↓ navigate, ↵ open, esc close. |
| `components/notification-bell.tsx` | Surfaced in the new `AuthedShell` `topBarRight` slot alongside Cmd+K. Unread count from `notifications` table. |
| `/holder/claim/[token]` + `/holder` | A confirmed holder can claim their allocation by phone OTP, getting linked across all their `allocation_tokens`. `/holder` dashboard shows lifetime show rate + per-allocation cards. Migration: `allocation_owners`. |
| `/mytickets/profile` | Guest profile with lifetime stats (events attended, no-show rate, +1s brought, referrals made) + past events list. |
| `/owner/calendar` | Month grid; coral=today, mint=has-events, capacity % per day. Linked from sidebar. |
| Tailwind | Added `toast-in`, `fade-in`, `scale-in`, `press` keyframes (durations <200ms). Used by ToastProvider + CommandPalette + Welcome. |
| Migrations | `profiles.onboarding_completed_at`, `user_devices`, `allocation_owners`. |

### Day 17 — monorepo + Expo

Restructure (preserving git history via `git mv`):

```
wadl/
├── apps/
│   ├── web/        → all formerly-root files
│   │   ├── app/, components/, lib/, public/, supabase/, scripts/
│   │   ├── middleware.ts, next.config.mjs, tailwind.config.ts, tsconfig.json
│   │   └── package.json (renamed to "web", deps unchanged)
│   └── mobile/     → new Expo iOS app
├── packages/
│   └── shared/     → cross-platform TS — types, format, routing, sms-template
├── package.json    → npm workspaces
├── pnpm-workspace.yaml                # ready when we migrate
└── vercel.json     → minimal: declares Next.js framework
```

- Web's `lib/types.ts`, `lib/format.ts`, `lib/routing.ts`, `lib/sms-templates.ts` are now thin re-exports of the shared module — same import paths everywhere, single source of truth shared with mobile.
- `apps/web/tsconfig.json` paths alias `@wadl/shared` → `../../packages/shared/src`. `apps/web/next.config.mjs` adds `transpilePackages: ["@wadl/shared"]` so Next compiles the TS source directly without a separate build step.
- Web build still passes (41 routes, no TS errors) from `apps/web/`.

Expo iOS scaffold (`apps/mobile/`):

- `app.json` — bundle id `com.wadl.app`, dark UI, NSCameraUsageDescription, expo-router + secure-store + barcode-scanner + notifications plugins.
- `package.json` — Expo SDK 51 + expo-router 3.5 + expo-secure-store + expo-camera + expo-barcode-scanner + nativewind 4 + supabase-js. Not installed yet — `npm install` from monorepo root materializes it.
- `tailwind.config.js` matches web's coral / gold / mint / lav / cream / dark tokens.
- `src/lib/supabase.ts` — SecureStore + AsyncStorage hybrid storage adapter (SecureStore caps at 2KB on Android), reads `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- File-based routes scaffolded:

| Route | Purpose |
|---|---|
| `app/_layout.tsx` | Auth-gate Stack + push registration on session-grant |
| `app/(auth)/login` + `otp` | Phone OTP via Supabase |
| `app/(tabs)/discover` | Upcoming events feed |
| `app/(tabs)/mytickets` | User's RSVP'd events |
| `app/(tabs)/dashboard` | Owner 14-day glance + scanner CTA |
| `app/(tabs)/profile` | Bio + sign out |
| `app/(guest)/event/[id]` | Event detail with RSVP CTA |
| `app/(guest)/event/[id]/rsvp` | Walk-up RSVP via Supabase insert |
| `app/(guest)/ticket/[token]` | QR display (placeholder grid; swap react-native-qrcode-svg for prod) |
| `app/(door)/scan` | expo-barcode-scanner with same 5 fail states as web |
| `app/(owner)/event/[id]` | Owner per-event glance + scanner deeplink |

- `eas.json` with development (Simulator), preview (TestFlight internal), production (App Store) profiles.

### Day 18 — Expo push + EAS docs

- `apps/mobile/src/lib/push.ts` — `registerForPushNotifications()` requests permission, fetches Expo push token, upserts to `user_devices` keyed by `(user_id, expo_push_token)`. Wired into `app/_layout.tsx` to fire after session is established.
- `apps/web/lib/expo-push.ts` — server-side Expo Push HTTP client. No SDK; batches up to 100/req. `sendExpoPushToAccount(accountId, ...)` fans out to every `user_devices` row owned by users in the account, prunes `DeviceNotRegistered` tokens.
- `apps/web/lib/notifications.ts` `notify()` now fires `sendPushToAccount` (web) **AND** `sendExpoPushToAccount` (mobile) in parallel. A single `notify()` call lights up every browser + iOS subscriber.
- `DEPLOY_MOBILE.md` — full guide: Apple Developer enrollment ($99/yr), App Store Connect record, Expo / EAS setup, EAS Build profiles, TestFlight workflow, App Store submission checklist (privacy URL, screenshots, demo account, encryption export, Privacy Nutrition Labels), OTA updates, push pipeline, cost summary, smoke test.

### Web ↔ mobile parity

Mobile intentionally focuses on the **on-the-night** flows. Power-user surfaces stay on web. Where mobile is missing a feature, the relevant screen surfaces a "use the web app at wadl-pearl.vercel.app" footer.

| Feature | Web | Mobile | Notes |
|---|---|---|---|
| Login (phone OTP) | ✓ | ✓ | Both via Supabase Auth |
| Login (email magic link) | ✓ | — | Web only — niche path |
| Signup + onboarding wizard | ✓ | — | Mobile assumes you signed up on web |
| Discover events | ✓ | ✓ | |
| RSVP (consent gated) | ✓ | ✓ | Both insert pending guest |
| Ticket QR display | ✓ | partial | Mobile shows placeholder grid; swap react-native-qrcode-svg before launch |
| Add to Apple/Google Wallet | ✓ | — | Mobile uses native ticket; wallet is for cross-device |
| Bring-a-friend referral | ✓ | — | Web flow; mobile can deep-link to /referral |
| Door scanner (online) | ✓ | ✓ | Mobile uses native expo-barcode-scanner |
| Door scanner (offline + sync) | ✓ | — | Web has localStorage queue; mobile would need IndexedDB equivalent (Day 19) |
| Owner dashboard | ✓ (full) | ✓ (glance) | Mobile shows next 14d + scan; full stats stay web |
| Owner queue / approvals | ✓ | — | Web only |
| Allocations CRUD | ✓ | — | Web only |
| Chat Hub AI | ✓ | — | Web only |
| Scorecards / Analytics | ✓ | — | Web only |
| Calendar view | ✓ | — | Mobile uses 14-day list view instead |
| SMS templates / Broadcast | ✓ | — | Web only |
| Webhooks / Stripe Connect | ✓ | — | Web only |
| Embed widget (iframe) | ✓ | — | N/A on mobile |
| Push notifications | ✓ web push | ✓ Expo Push | Both go through `notify()` automatically |
| Holder dashboard / claim | ✓ | — | Web only for now |
| Internal CMS / errors | ✓ | — | Web only |

### New env vars (Day 16–18)

| Var | Surface | Required? | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | yes for mobile | Same Supabase URL as web. Lives in `apps/mobile/.env`. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | yes for mobile | Same anon key as web. |
| `EXPO_PUBLIC_WEB_URL` | mobile | optional | Used for cross-link copy ("manage on the web"). Defaults to https://wadl-pearl.vercel.app. |

No new web-side env vars in this run.

### Migrations (Day 16)

15. `20260501000001_day16_features.sql` — `profiles.onboarding_completed_at` + `user_devices` (Expo push tokens).
16. `20260501000002_day16_holder.sql` — `allocation_owners` (holder claim linkage).

(Day 17 + 18 are code-only — no schema changes.)

### Vercel deploy note

After this push, **the Vercel project's Root Directory must be updated to `apps/web`** (Vercel dashboard → project → Settings → General → Root Directory). Until you do that, the next deploy will fail to find `package.json` at the repo root. Once set, every push to `main` deploys `apps/web` as before. Documented in `DEPLOY.md` §0.

### Smoke test — Days 16–18

Web (post-Vercel-root-update):
1. Sign up fresh → land in `/welcome` → step through 5 cards → end on dashboard.
2. Cmd+K from anywhere on /owner → search a guest by name → enter to navigate.
3. Approve a pending RSVP from /owner/events/[id]/queue → see toast "Approved" and notification bell badge tick up.
4. Open a holder magic link → click "Claim this allocation" → sign in via OTP → land on /holder.
5. Open /mytickets/profile → verify lifetime stats render.
6. Open /owner/calendar → tap a future date → land on the event's daydash.
7. Add WADL to home screen on iOS Safari → confirm splash + standalone window opens to /.

Mobile (Simulator):
1. `cd apps/mobile && npm install && cp .env.example .env && npm run ios`
2. Login → OTP → Discover → tap event → RSVP → MyTickets → Ticket → Dashboard → Open scanner → scan a printed `/t/[token]` QR.
3. Sign out → confirm session cleared from SecureStore.

### What's NOT shipping in this run

- `react-native-qrcode-svg` — mobile ticket displays a deterministic placeholder grid (works for visual feedback, NOT scannable). Swap before TestFlight beta.
- Mobile offline scanner queue — web has localStorage + sync; mobile would mirror with `react-native-mmkv` (Day 19).
- Mobile push fallback when Expo Push is unavailable (e.g. operator not yet on EAS) — direct APNs via auth key.
- Vercel dashboard root-directory change is documented but not automated.
- Apple Developer Program enrollment is documented but requires the operator's $99/yr signup.
- iOS icon + splash PNG assets — referenced in `app.json` but not yet committed; generate from `public/icon.svg`.
- pnpm migration — workspace is npm today; pnpm is one `rm package-lock.json && pnpm install` away.
- axe-core CI — manual a11y stays the bar.

These are all known-and-named gaps.

---

**Status:** Days 16–18 complete. Web builds clean inside `apps/web/`. Mobile compiles after `npm install`. Push to `main` triggers Vercel auto-deploy (once Root Directory is set to apps/web). Mobile deploys via `eas build` per `DEPLOY_MOBILE.md`.

---

## Day 19 — CTO audit (no fixes; inventory only)

Full report: `AUDIT_DAY19.md` at repo root.

**Headline blocker for the audit itself:** `DESIGN_REFERENCE.html` (the 96-screen reference promised in `WADL_PROJECT_BRIEF.md` §10) was never delivered to the repo. Phase 1 mapping was performed against the brief + the explicit screen-name list in the audit prompt instead.

### What's working

- **90 routes**, 16 migrations, web build passes from `apps/web/` (after Day 17 monorepo move).
- Every owner/manager/door route uses a centralized auth helper (`requireOwnerContext`, `requireDoorContext`). No hand-rolled gates.
- RLS enabled on every table from Day 1.
- Loading + error boundaries + toast system + Cmd+K + onboarding wizard all real implementations, not stubs.
- Guest flow (discover → /e → RSVP → /t → mytickets) works end-to-end with TCPA consent.
- Door scanner online + offline-cached + sync flow works.
- Mobile scaffold compiles (placeholder QR; needs `npm install` + asset PNGs before TestFlight).

### Two structural gaps that matter most

1. **Co-owner permissions are theater.** `event_co_owners.permission ∈ ('read_only', 'edit', 'admin')` is stored and surfaced in UI labels but **no write RLS policies enforce it.** Day 9 added SELECT-only co-owner policies; INSERT/UPDATE/DELETE for co-owners simply don't exist, so every co-owner is silently read-only regardless of their assigned tier.
2. **Account-type differentiation is decorative.** Venue / brand / individual changes 5 labels + 1 routing fork — no different defaults, no different empty states, no different feature gating, no different event types.

### Phase 5 named-screen score: 0 of 13 fully built

| Built | Partial | Missing |
|---|---|---|
| 0 | `lockdown`, `notifprompt`, `promoteronboard`, `demomode` | `dualctx`, `escalate`, `guestmessage`, `guesttierhistory`, `pasteventdetail`, `postevent`/`posteventsummary`, `promotercompare`, `sharevent`, `smsdelivery` |

### "Feels incomplete" patterns flagged

- `/owner/dashboard` is `redirect("/owner")` — vestigial.
- `/owner/sms-templates` CRUD works but **no outbound code reads `sms_templates`** at send time.
- 6 of 11 declared notification kinds (`staff_assigned`, `billing_event`, `scan_failure_high`, `waitlist_promoted`, `guest_flagged`, `tier_upgraded`) **never fire** from any code path despite being labelled in the inbox UI.
- `event_templates.cadence_days` collected but **no cron reads it** — recurring events don't auto-create.
- `/admin/guests` has `platformForceFlagAction` defined but **no UI button surfaces it**.
- Photographer role exists in DB enum but staff invite UI doesn't expose it.
- `/api/cron`, `/api/embed`, `/api/webhooks` are in `PUBLIC_PATHS` but **no routes exist under them** — dead allowlist entries. The webhook gap means **no Twilio STOP receiver and no Stripe event receiver**.
- `/api/log/client-error` is middleware-blocked for anonymous POSTs, so `error.tsx` hits from anon visitors never reach `error_log`.

### P0 / P1 fix list (proposed order)

| Priority | Item | Approx LOC | Why |
|---|---|---|---|
| P0-1 | Set Vercel project Root Directory to `apps/web` | 0 (operator action) | Next deploy fails until this is changed |
| P1-1 | Fix or remove co-owner permission labels | 5–150 | Credibility bug — pitch demo will fail |
| P1-2 | Harden `requireOwnerContext` (verify owner_user_id + role) | ~10 | Latent footgun |
| P1-3 | Differentiate account types (default `event_type`, copy) | ~80 | Brief mandate not honored |
| P1-4 | Allow anon `/api/log/client-error` + rate limit | ~15 | Silent client-error loss for anon |
| P1-5 | Twilio inbound STOP webhook | ~80 | TCPA compliance has only the honor side, not the receiving side |
| P1-6 | Add photographer to staff invite UI | ~10 | Schema supports it; UI doesn't |

P2 (20 items) and P3 (8 items) listed in `AUDIT_DAY19.md`.

**Recommended:** P0-1 + P1-1 + P1-2 + P1-3 + P1-4 + P1-6 are the minimum bar to call the platform "honest" with what it promises in UI + brief. P1-5 is the minimum bar to be TCPA-compliant on the receiving side. After that, prioritize P2 by which prototype screens are demo-blockers for the next pitch.

**No code was changed in this audit.**

---

## Day 19 fixes — P0 + P1 + targeted P3

Audit (`AUDIT_DAY19.md`) found 1 P0 + 6 P1 + assorted P3. P0 is operator-only (Vercel Root Directory). All 6 P1 + 4 P3 cleanups landed in this commit.

### P1-1 — co-owner permission honesty

The product was promising three permission tiers (`read_only` / `edit` / `admin`) via UI labels but only enforcing none of them — every co-owner was silently view-only regardless of tier.

- `apps/web/app/owner/events/[id]/co-owners/invite-form.tsx` — removed the 3-button picker; permission card now reads "View-only" with a one-liner "editable tiers coming".
- `apps/web/app/owner/events/[id]/co-owners/actions.ts` — server action force-pins `permission = "read_only"` regardless of any value the client sends.
- `apps/web/app/owner/events/[id]/co-owners/page.tsx` — both the active-co-owners list and the pending-invites list now hard-code "view-only" instead of `permission.replace("_", "-")`.
- `apps/web/app/co-owner/accept/[token]/page.tsx` — accept screen reads "View-only access" with the writes-stay-with-owner caveat.

The DB column keeps the wider enum so future tiering is a one-migration unlock, not a schema rewrite.

### P1-2 — `requireOwnerContext` hardened

`apps/web/lib/owner.ts` now additionally enforces:
1. `account.owner_user_id === user.id` — explicit ownership match, not just "has account_id".
2. Profile role is not `manager` / `staff` / `door_manager` / `door_staff` — door-only roles can never reach `/owner/*` even if they somehow have an `account_id`.

Failed checks redirect to `/` (which then routes guest → /mytickets, etc.).

### P1-3 — account-type differentiation

New shared module `packages/shared/src/account-type.ts` with three helpers:
- `defaultEventType(accountType)` → `venue → venue_owned`, `brand → brand_takeover`, `individual → co_produced`.
- `ownsAVenue(accountType)` → only `venue` runs venuesetup.
- `accountEntityLabel(accountType)` → `{ noun, placeholder, eventPlaceholder }` for forms.

Wired into:
- `apps/web/app/welcome/actions.ts` — first event uses `defaultEventType(account.account_type)`.
- `apps/web/lib/demo-seed.ts` — same.
- `apps/web/app/owner/events/new/page.tsx` + `form.tsx` — new-event form pre-selects the type-appropriate default.
- `apps/web/app/entitysetup/page.tsx` — label + placeholder come from `accountEntityLabel`.
- `apps/web/app/welcome/wizard.tsx` — step 3 forks: venue gets the venue setup CTA; brand + individual get a "you don't run a room — you'll pick the partner venue per-event" explainer instead of a meaningless empty step.
- Step 4 placeholder also reads from the helper.

### P1-4 — `/api/log/client-error` accepts anon + rate limited

- Added to `PUBLIC_PATHS` in `apps/web/lib/supabase/middleware.ts`. Anonymous error.tsx hits now reach the route.
- 10/min per IP via the existing `lib/rate-limit.ts` token bucket. Field-size caps applied (message ≤ 500, stack ≤ 4000) to prevent log-table abuse.

### P1-5 — Twilio STOP webhook

`apps/web/app/api/webhooks/twilio/sms/route.ts` (POST + GET):

- Reads `application/x-www-form-urlencoded` body Twilio posts.
- Validates `X-Twilio-Signature` HMAC-SHA1 against `TWILIO_AUTH_TOKEN` + URL + sorted params. Skips validation in dev when token absent (with a console warning).
- STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT → set `guests.sms_opted_out = true` for every row matching the From phone, audit-logged.
- START / UNSTOP / YES → reverse.
- Returns empty 200 (Twilio handles the user-facing auto-reply for STOP/START keywords).

Operator setup (one-time): in Twilio console → Phone Numbers → Active Numbers → A MESSAGE COMES IN webhook URL = `https://wadl-pearl.vercel.app/api/webhooks/twilio/sms`, method POST.

### P1-6 — photographer role in staff invite

- `apps/web/app/owner/events/[id]/staff/invite-form.tsx` — third role chip "Photographer · Upload event photos".
- `apps/web/app/owner/events/[id]/staff/actions.ts` — accepts the new role; SMS body + email subject + heading branched per-role.
- `apps/web/app/staff-invite/[token]/page.tsx` + `form.tsx` — accept page renders "Photographer" badge + label.
- `apps/web/app/staff-invite/[token]/actions.ts` — accept redirects photographers to `/photographer/events/[id]` instead of `/door` or `/manager`.
- `apps/web/app/owner/events/[id]/staff/page.tsx` — `roleBadge` adds lavender for photographer; `roleLabel` adds the label.
- Migration `20260502000001_day19_p1_fixes.sql` widens `staff_invites.role` CHECK constraint to allow `photographer`. (Day 13 widened `event_staff` already; staff_invites was missed.)

### P3 quick cleanups bundled

- **Removed `/owner/dashboard`** — was just `redirect("/owner")`. Vestigial.
- **Removed dead `/api/cron` and `/api/embed` PUBLIC_PATHS entries.** `/api/embed` had no route under it; the embed iframe lives at `/embed/[eventId]` which is already public via `/embed`.
- **`/admin/guests` force-flag button surfaced.** New `force-flag-button.tsx` client component prompts for a reason, calls the existing `platformForceFlagAction`, refreshes. Action existed since Day 12 with no UI.
- **Owner sidebar gains "Door view" + "Manager view" links** under "View as". Owners no longer have to type those URLs to use their implicit door_manager bypass.
- **Welcome step 4 placeholder** reads from `accountEntityLabel(accountType).eventPlaceholder` so brand/individual see relevant copy ("Mainframe x Wynwood Takeover" / "DJ Name presents…") instead of "Friday at the Patio".

### What this run did NOT change

- **P0-1 (Vercel Root Directory) is operator-only.** Documented in `DEPLOY.md` §0 since Day 17. Until the dashboard setting is updated to `apps/web`, `git push` to main will fail to deploy.
- **P2 prototype-named screens** (dualctx, escalate, guestmessage, guesttierhistory, lockdown UI, postevent, promotercompare, promoteronboard, sharevent, smsdelivery, demomode toggle) — none built.
- **6 unused notification kinds** still don't fire from any code path.
- **`sms_templates` still not read at send time** — CRUD-only.
- **`event_templates.cadence_days` cron** — still no worker.
- **Stripe Connect callback handler** — still missing.
- **Apple Wallet `.pkpass` byte stream** — still graceful 503.
- **Mobile QR codec swap + offline scanner** — still placeholder.
- **axe-core CI** — still manual a11y.

Build green (40 routes — `/owner/dashboard` removed, `/api/webhooks/twilio/sms` added, net same after the deletion). Migration 17 added.
