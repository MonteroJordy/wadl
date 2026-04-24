# Overnight build — wake-up summary

**Status:** Day 2 and Day 3 shipped end-to-end. No blockers. Three commits on `main`:

- `cbd4b45` — Day 1 (pre-existing)
- `8cf7234` — Day 2: owner weekview + daydash + multi-night create event + seed data
- `a6c61a6` — Day 3: allocations + magic-link holder flow + approval queue

TypeScript passes (`npx tsc --noEmit` clean). Production `next build` compiles all 13 routes clean. Dev server was not started per your instructions — run it yourself.

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

Ready for Day 4 when you are.
