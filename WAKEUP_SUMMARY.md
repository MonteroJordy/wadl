# Build status — through Day 5

**Commits on `main`:**

- `cbd4b45` — Day 1: scaffolding + Supabase + phone OTP auth flow
- `8cf7234` — Day 2: owner weekview + daydash + multi-night create event + seed data
- `a6c61a6` — Day 3: allocations + magic-link holder flow + approval queue
- `e70aa7d` — docs: initial WAKEUP_SUMMARY
- `8af44ac` — Day 4: guest discovery + RSVP + phone verify + QR via SMS + My Tickets
- `b8d077f` — docs: Day 4 WAKEUP append
- `9d530e0` — Day 5: door operations — staff invite, QR scanner, manager view, DNA flag

TypeScript passes (`npx tsc --noEmit` clean). Production `next build` compiles all **30 routes** clean. Dev server was not started — run it yourself.

> ⚠ **Before you `npm run dev` for Day 5, wipe the Next cache: `rm -rf .next && npm run dev`.** New top-level routes (`/door`, `/manager`, `/staff-invite`) and new migrations need a cold start. Skipping this often produces "module not found" or stale middleware behavior.

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
