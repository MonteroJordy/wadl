# WADL — Day 19 Audit

**Mode:** CTO review. Inventory only. No fixes.
**Scope:** apps/web/ as of commit `fab42dd`. 90 routes (page + route handlers).
**Prerequisite blocker:** `DESIGN_REFERENCE.html` was promised in `WADL_PROJECT_BRIEF.md` §10 ("A detailed design reference HTML (96 screens) will be provided after Day 1") but was never delivered to the repo. Phase 1's prototype-vs-reality mapping is therefore performed against the brief's spec + the explicit screen-name list in Phase 5 of the audit prompt instead. **This is the single biggest risk in any "are we done?" question — the spec is anchored to a reference we don't have.**

---

## Phase 1 — Route inventory

### Public routes (no auth required)

| Route | Status | Notes |
|---|---|---|
| `/` | real | Anonymous = marketing landing. Authed = onboarding-aware redirect. |
| `/pricing` | real | Three tiers, FAQ. |
| `/privacy` | real | 8-section policy. |
| `/terms` | real | 12-section ToS. |
| `/docs`, `/docs/embed` | real | Embed-widget docs. Index lists embed/webhooks/ics/wallet. |
| `/discover` | real | Lists upcoming events with at least one night in next 60d. |
| `/e/[eventId]` | real | Event detail + RSVP CTA. |
| `/e/[eventId]/rsvp` | real | TCPA-consent gated; phone OTP; walk-up allocation. |
| `/e/[eventId]/gallery` | real | Public photo gallery (Day 13 photographer flow). |
| `/t/[token]` | real | QR ticket display + wallet/calendar/referral links. |
| `/h/[token]` | real | Holder magic-link page; add guests up to cap. |
| `/holder/claim/[token]` | real | Phone-claim flow → links allocation_owners. |
| `/referral/[guestId]` | real | Friend-referral; same allocation as referrer. |
| `/co-owner/accept/[token]` | real | Co-owner invite acceptance. |
| `/staff-invite/[token]` | real | Staff invite acceptance. |
| `/embed/[eventId]` | real | iframe RSVP widget. |
| `/login`, `/otp`, `/signup` | real | Phone OTP + email magic-link tabs. |
| `/entitysetup`, `/venuesetup` | real | Onboarding steps 2 + 3. |
| `/welcome` | real | 5-step wizard (added Day 16). |
| `/mytickets`, `/mytickets/profile` | real | Guest ticket inbox + profile stats. |
| `/sitemap.xml`, `/robots.txt` | real | Static + dynamic event URLs. |

### Authed owner routes

| Route | Status | Notes |
|---|---|---|
| `/owner` | real | Week / range filter + venue switcher. |
| `/owner/dashboard` | **stub** | `redirect("/owner")` — vestigial. |
| `/owner/calendar` | real | Month grid (Day 16). |
| `/owner/profile` | real | Bio + venues + team + push subscribe + share + danger zone. |
| `/owner/notifications` | real | Inbox; mark-all-read. |
| `/owner/scorecards` + `/owner/scorecards/[holderId]` | real | Cross-event leaderboard + per-holder. |
| `/owner/analytics` | real | 90-day rolling. |
| `/owner/flags` | real | Cross-event DNA registry. |
| `/owner/guests/merge` | real | Side-by-side merge; older record wins. |
| `/owner/sms-templates` | **partial** | CRUD works; **no outbound send path reads `sms_templates`** — the templates exist as records but nothing renders them at send time. |
| `/owner/billing` | **graceful stub** | 3-state UI (no Stripe key / no customer / has portal). Without `STRIPE_SECRET_KEY` it's an email-support CTA. |
| `/owner/payouts` | **graceful stub** | Without `STRIPE_CONNECT_CLIENT_ID` shows "coming soon". With it, OAuth onboard URL exists but no callback handler. |
| `/owner/webhooks` | real | Endpoint CRUD + recent deliveries panel. |
| `/owner/errors` | real | Platform-owner-only error log viewer. |
| `/owner/events/new` | real | Multi-night creator. |
| `/owner/events/[id]` | real | Daydash with realtime counters. |
| `/owner/events/[id]/settings` | real | Edit + add/edit nights. |
| `/owner/events/[id]/allocations` + `[allocId]` + `/new` | real | Full CRUD + magic-link rotate. |
| `/owner/events/[id]/queue` | real | Approval queue with bulk actions. |
| `/owner/events/[id]/guests/[guestId]` | real | Detail + flag + notes/tags + tier upgrade + cancel. |
| `/owner/events/[id]/guests/import` | real | CSV import w/ preview, dedupe. |
| `/owner/events/[id]/staff` | real | Invite door staff/manager. |
| `/owner/events/[id]/co-owners` | **partial** | Invite UI works; permission stored; **no enforcement** (see Phase 3). |
| `/owner/events/[id]/recap` | real | Post-event summary. |
| `/owner/events/[id]/audit` | real | Audit log viewer. |
| `/owner/events/[id]/scorecards` | real | Event-scoped scorecard. |
| `/owner/events/[id]/print` | real | Print-CSS roster. |
| `/owner/events/[id]/export` (CSV), `/export/pdf` | real | Both formats. |
| `/owner/events/[id]/clone` | real | Date-shift clone. |
| `/owner/events/[id]/template` | real | Save shape; create-from-template (cron auto-create not wired). |
| `/owner/events/[id]/chathub` | real | Claude API parsing + commit. |
| `/owner/events/[id]/broadcast` | real | Filtered SMS w/ dry-run cost. |
| `/owner/events/[id]/waitlist` | real | Auto-promote on cancel. |

### Authed staff/manager routes

| Route | Status | Notes |
|---|---|---|
| `/door` | real | Auto-redirect to single event or pick. |
| `/door/events/[id]` | real | Stats + scan + search CTAs. |
| `/door/events/[id]/scan` | real | QR scanner with offline-cache + queue + sync. |
| `/door/events/[id]/search` | real | Name search + manual check-in. |
| `/manager` | real | door_manager events picker. |
| `/manager/events/[id]` | real | Filtered guest list. |
| `/manager/events/[id]/add` | real | Mid-event manual add. |
| `/manager/events/[id]/guests/[guestId]` | real | Guest detail (gold accent). |
| `/photographer/events/[id]` | real | Multi-file upload to event-photos bucket. |

### Admin / platform-owner routes (gated by email match)

| Route | Status | Notes |
|---|---|---|
| `/admin` | real | Stats counters. |
| `/admin/accounts` | real | Read-only list. |
| `/admin/events` | real | Read-only list (last 200). |
| `/admin/guests` | real | Searchable; force-flag action exists in actions.ts but **not surfaced in UI**. |

### API routes

| Route | Status | Notes |
|---|---|---|
| `/api/auth/signout` | real | |
| `/api/health` | real | |
| `/api/search` | real | Cmd+K backing. |
| `/api/log/client-error` | **partial** | Wired into `error.tsx` but **middleware blocks anonymous POST** (route not in PUBLIC_PATHS), so anon errors never log. Authed users could spam — no rate limit. |
| `/api/push/subscribe` | real | Web Push (Day 12). |
| `/api/door/manifest/[nightId]` | real | Offline scanner manifest. |
| `/api/door/sync` | real | Offline scan queue sync. |
| `/api/wallet/apple/[token]` | **graceful stub** | 503 even when certs present — `.pkpass` byte stream needs PKCS#7 lib. |
| `/api/wallet/google/[token]` | real | Full JWT-signing implementation. |
| `/api/events/[id]/calendar.ics`, `/api/events/[id]/ics` | real | Aliased. |
| `/api/og/landing`, `/api/og/event/[id]` | real | Dynamic OG via `next/og`. |
| `/api/embed/...` | (none) | `/api/embed` is in PUBLIC_PATHS but no route exists. **Dead allowlist entry.** |
| `/api/webhooks/...` | (none) | Same — public path with no routes. **Webhook receivers (Twilio inbound STOP, Stripe events) are not wired.** |
| `/api/admin/prune-audit` | real | Cron-secret OR platform-owner gated. |
| `/api/cron/...` | (none) | `/api/cron` in PUBLIC_PATHS but **no /api/cron/* route exists**. Dead allowlist entry. |
| `/api/billing/checkout` | **stub** | Documented as TODO; redirects to /owner/billing?checkout=not-implemented. |
| `/api/billing/portal` | real | Hits Stripe REST API directly. |

---

## Phase 2 — Account-type differentiation audit

The brief defines three account types: **venue, brand, individual**. The user picks one at signup and it lands on `accounts.account_type`.

### Where account_type matters in code

1. `apps/web/app/page.tsx:52` — only `venue` accounts get a venue-existence check before redirecting.
2. `apps/web/app/owner/profile/page.tsx:61–84` — badge label + accent color (coral/gold/mint).
3. `apps/web/app/owner/page.tsx:331` — printed in tiny mono footer.
4. `apps/web/app/owner/billing/page.tsx:23` — printed in subtitle.
5. `apps/web/app/welcome/wizard.tsx:127–135` — labelled in step 2 of the wizard.
6. `apps/web/app/entitysetup/page.tsx:97–124` — input label + placeholder change ("Floyd Miami" vs "Mainframe" vs "your name").
7. `apps/web/app/signup/page.tsx:84` + `entitysetup:93` — routing fork: venue → /venuesetup, others → /welcome.

### Where it should matter and doesn't

- **Default templates / event types.** A venue defaults to `event_type: "venue_owned"`. A brand should default to `brand_takeover` or `brand_pop_up`. A solo promoter should default to `co_produced`. We hardcode `venue_owned` in `app/welcome/actions.ts:51`, `app/owner/events/new/...`, and the demo seed regardless of account type.
- **Empty-state copy + onboarding nudges.** A brand new "individual" promoter sees the same "Set up your venue" empty state as a venue owner. Brands and individuals don't *have* a venue in the WADL sense; they piggyback on someone else's. The wizard step 3 is forcibly skipped for non-venues but the event creation flow still asks for a venue (nullable but unguided).
- **Permissions to be invited as co-owner.** A brand should be able to be invited to co-own a venue's event; individuals less so. No code surfaces that distinction.
- **Billing tier gating.** Pricing copy at `/pricing` says "Pro = up to 3 venues" — but billing/Pro entitlements aren't enforced anywhere. A free Starter individual can create 50 venues today.
- **Discoverability.** No surface lets a guest filter `/discover` by venue vs brand vs individual host.

**Verdict:** account_type is a label, not a feature axis. Zero meaningful experience differentiation past the entity-name label change. **The brief explicitly differentiated three types; the product treats them as one.**

---

## Phase 3 — Role permissions audit

### `requireOwnerContext()` (`apps/web/lib/owner.ts`)

Body checks: `user exists` → `profile has full_name` → `profile has account_id` → `account exists`. **It does not verify `account.owner_user_id === user.id`** and does not check `profile.role === "owner"`. Today only one user per account is supported (account.owner_user_id is a single FK), so in practice the gap is theoretical, but:

- The function name promises ownership; it delivers "is onboarded".
- The DB schema already permits multiple profiles per account_id (profiles.account_id is a nullable FK). If two users ever share an account_id, both would pass `requireOwnerContext` even though only one is the owner_user_id.
- Defense-in-depth missing: should also enforce `profile.role === "owner"` so a `staff` or `guest` role profile that somehow has account_id can't slip in.

**Severity: low today, latent footgun.**

### `requireDoorContext()` (`apps/web/lib/door.ts`)

- Correctly enforces `requireRole === "door_manager"` when set; door_staff lands on /door not /manager.
- Owner self-bypass: account owners are implicitly granted `door_manager` for their own events. **Implicit; not surfaced anywhere in the owner UI.** Owners must type the URL `/manager/events/<id>` or `/door/events/<id>` to use it.
- The `staff[]` union includes both owner-implicit + explicit event_staff rows; if owner is also explicitly staff for the same event, role conflicts are silently resolved (the explicit row wins because it's pushed first).

### Co-owner permissions — **the biggest gap**

The schema stores `event_co_owners.permission ∈ ('read_only', 'edit', 'admin')` and `co_owner_invites.permission` likewise. The accept page surfaces the level. But:

- **No write policy exists for co-owners on `events`, `event_nights`, `allocations`, `guests`, `check_ins`, or any other owner-scoped table.** Day 9 added SELECT policies only.
- Therefore "edit" and "admin" permissions are theater. A co-owner with `permission = "admin"` can READ everything but writes get RLS-blocked, identical to a "read_only" co-owner.
- The owner UI promises "edit" and "admin" tiers; the product enforces only "read_only" for everyone.

**Severity: high — this is a credibility bug. A pitch demo to a venue group ("invite your manager as edit") will silently fail.**

### Photographer role

- DB enum includes `'photographer'` (added Day 13).
- Staff invite UI at `/owner/events/[id]/staff` only offers `door_staff` / `door_manager`. **No way to add a photographer through the product.** Workaround: SQL or `/admin`.

### `/api/log/client-error`

- Not in PUBLIC_PATHS → middleware redirects unauthenticated POSTs to `/login`. So when an anonymous visitor hits a route that triggers `error.tsx`, the client-side fetch fails silently. The error never reaches `error_log`. Coverage is owner+staff only.
- No auth check inside the handler → any signed-in user can POST arbitrary fake errors. No rate limit.

### `/api/cron/*` and `/api/embed/*` and `/api/webhooks/*`

- All three are in PUBLIC_PATHS but **no routes exist under them**. Dead allowlist entries — minor clutter.
- `/api/webhooks/*` not existing means: **no Twilio inbound webhook for STOP** (TCPA opt-out is plumbed in `sendSms()` honor but never gets the inbound signal), and **no Stripe webhook** (so subscription state changes never reach our DB even if billing were wired).

### Routes lacking permission checks entirely

None at the route level — every owner/manager/door route has a guard. Two exceptions:

- `/api/log/client-error` (above).
- `/admin/guests/actions.ts` `platformForceFlagAction` re-checks platform-owner email itself (good), so the action is gated even though the parent layout is the only structural gate.

---

## Phase 4 — "Feels incomplete" patterns

Audited every owner/manager route. Failures only:

| Route | Failure | Detail |
|---|---|---|
| `/owner/dashboard` | dead route | `redirect("/owner")`. Vestigial. Remove. |
| `/owner/sms-templates` | not wired downstream | CRUD works; nothing reads `sms_templates` at send time. The templates are decorative. |
| `/owner/billing` | dead-end CTA branch | Stripe-key-but-no-customer branch sends to `/api/billing/checkout` which redirects back with a query string. No user-visible feedback. |
| `/owner/payouts` | half-stub when env set | OAuth onboarding URL exists; no callback handler at `/api/oauth/stripe-connect` (or wherever). Setting STRIPE_CONNECT_CLIENT_ID gives the operator a one-way trip into Stripe. |
| `/owner/notifications` | kinds drift | NotificationKind enum has 11 kinds; only 5 are ever fired by any code (rsvp_pending, capacity_alert, referral_arrived, broadcast_sent, co_owner_accepted-via-claim). The other 6 (staff_assigned, billing_event, scan_failure_high, waitlist_promoted, guest_flagged, tier_upgraded) are unused — they exist as labels in the inbox UI but no codepath emits them. |
| `/admin/guests` | force-flag invisible | `platformForceFlagAction` exists in actions.ts but the page UI has no "force flag" button. Action callable only via direct POST. |
| `/owner/events/[id]/template` | half-feature | Save + create-from-template work. `cadence_days` + `next_run_at` are populated but **no cron / worker reads them** — auto-create never fires. |

**Loading + error states:** every owner/manager route has either a `loading.tsx` or a server-component skeleton, plus an `error.tsx` boundary at the route-group level. Coverage is good.

**375px mobile width:** authed-shell collapses to hamburger on <md. Owner content uses `max-w-frame md:max-w-3xl` consistently. Random spot checks: /owner/calendar grid is 7-col which compresses tightly at 375px (each cell ~50px) but stays inside the viewport. /admin tables overflow horizontally with `.overflow-x-auto` — acceptable for a desktop-intent surface.

### Guest-facing routes

| Route | Failure |
|---|---|
| `/discover` | none — real, with EmptyState. |
| `/e/[eventId]` | none — real with metadata + OG. |
| `/e/[eventId]/rsvp` | none — TCPA gate enforced server-side. |
| `/t/[token]` | wallet button click on Apple returns JSON 503 — graceful UX-wise but a 503 in the browser address bar is jarring; should be wrapped in a friendlier landing page. |
| `/mytickets` | none. |
| `/referral/[guestId]` | requires referrer's RSVP to be `approved` and on a hosted (allocation-bearing) list — walk-up RSVPs can't refer. **Probably correct, but undocumented in the UI.** |

### Onboarding flow

`signup → entitysetup → venuesetup (only if account_type=venue) → /welcome → /owner`.

- `/welcome` is a real 5-step wizard, not a stub. ✓
- Routing is correct. nextOnboardingStep() inserts /welcome at the right spot.
- **Skips:** the wizard never hard-skips anything but step 3 ("Set up venue") becomes a no-op for brand/individual accounts (just shows "edit venues" link). For a non-venue account, that step is filler — could be replaced with "invite your first holder" or "add a brand link" but isn't.
- **Race condition:** if the user closes the browser mid-wizard, `profiles.onboarding_completed_at` stays null and they restart at step 1 next time. There's no resume-from-step-N.

---

## Phase 5 — Named prototype screens

Per the audit prompt's explicit list:

| Screen | Status | Notes |
|---|---|---|
| `dualctx` (context switcher) | **NOT BUILT** | A user who is staff for event A + guest for event B has no in-app affordance to switch context. Owner sidebar has "View as guest" links but no inverse. |
| `escalate` (door staff escalation) | **NOT BUILT** | Door scanner has 5 fail states; no "page the manager" button on a fail. |
| `guestmessage` (DM owner→guest) | **NOT BUILT** | `/owner/events/[id]/broadcast` exists for filtered group SMS; no per-guest DM. |
| `guesttierhistory` | **NOT BUILT** | `tier_upgraded_at` exists; no chronological view of changes. |
| `lockdown` (capacity-triggered UI) | **PARTIAL** | `lockdown_threshold_pct` column exists on event_nights; capacity_alert notification fires at 90%; **no dedicated lockdown UI** — no "list closed" banner pushed to holders, no auto-flip of `list_open` when threshold crossed. |
| `notifprompt` (push permission prompt) | **PARTIAL** | `PushSubscribeButton` lives on `/owner/profile` only. No contextual prompt elsewhere — guests never get asked, owners only see it if they navigate to profile. |
| `pasteventdetail` (guest views past event) | **NOT BUILT** | `/mytickets/profile` lists past events; tapping an old ticket goes to /t/[token] which still shows QR. No dedicated "you attended this on..." past-event view. |
| `postevent` / `posteventsummary` | **NOT BUILT** | No "thanks for coming" guest screen. The post_event_thanks SMS template exists and is unused (see Phase 4). |
| `promotercompare` (compare two promoters) | **NOT BUILT** | Scorecards rank holders 1..N; no side-by-side compare. |
| `promoteronboard` (promoter signup from invite) | **PARTIAL** | `/holder/claim/[token]` exists for self-claim with stats; no branded "you've been invited by [Owner], here's what to expect" flow. The link to claim is buried in a footer line on `/h/[token]`. |
| `sharevent` (guest shares event) | **NOT BUILT** | OG meta tags exist (Day 14) so iMessage previews are nice, but no in-app share button on `/e/[eventId]` — guests have to long-press the URL. |
| `smsdelivery` (admin SMS log) | **NOT BUILT** | `broadcasts` table records sends but no UI lists them. No view of individual SMS deliveries (Twilio status, errors). |
| `demomode` (demo mode for sales) | **PARTIAL** | `seedDemoData` runs once from /welcome step 1 ("Load demo data"). No "demo mode" toggle the founder can flip on/off for sales calls; no rolling reset. |

**Score: 0 of 13 fully built. 4 partial. 9 missing.**

---

## Phase 6 — Prioritized fix list

### P0 — broken / blocking

| # | Issue | Files | Approx LOC |
|---|---|---|---|
| P0-1 | Vercel project Root Directory still set to repo root after Day 17 monorepo restructure. **Next deploy will fail.** | Vercel dashboard config (no code) | 0 — operator action |

That's the only true P0. The build is green, no 404s, no crashes. The deploy is one-click away from working once Vercel is reconfigured.

### P1 — missing critical

| # | Issue | Files | Approx LOC | Order |
|---|---|---|---|---|
| P1-1 | Co-owner `permission` ("read_only", "edit", "admin") is theater — no write policies enforce it. Either remove the labels (1-line UI fix + remove migration future-rev) or add real RLS write policies + helper. | `supabase/migrations/<new>.sql`, `apps/web/lib/owner.ts` (add `requireOwnerOrCoOwner`), maybe `apps/web/app/owner/events/[id]/co-owners/page.tsx` UI | ~150 LOC for full fix; ~5 to remove the label promise | 1 |
| P1-2 | `requireOwnerContext` doesn't actually check `account.owner_user_id === user.id` or `profile.role === "owner"`. Misnamed, latent footgun once the schema supports multi-user accounts. | `apps/web/lib/owner.ts` | ~10 LOC | 2 |
| P1-3 | Account-type differentiation absent. Brief mandates three types; product treats them as one. At minimum, default `event_type` per account type + skip "venue" empty-state copy for brand/individual. | `apps/web/lib/owner.ts`, `apps/web/app/welcome/actions.ts`, `apps/web/app/owner/events/new/...`, copy in 3-4 places | ~80 LOC | 3 |
| P1-4 | `/api/log/client-error` is middleware-blocked for anonymous POSTs → anon users hitting `error.tsx` never log. Add to PUBLIC_PATHS + add per-IP rate limit. | `apps/web/lib/supabase/middleware.ts`, `apps/web/app/api/log/client-error/route.ts` | ~15 LOC | 4 |
| P1-5 | Twilio inbound STOP webhook missing — TCPA opt-out is honored at send time but only when set manually. Add `/api/webhooks/twilio/sms` that flips `sms_opted_out` on STOP. | new route + Twilio webhook URL config | ~80 LOC | 5 |
| P1-6 | Photographer role exists but staff invite UI doesn't expose it. | `apps/web/app/owner/events/[id]/staff/invite-form.tsx`, `actions.ts` | ~10 LOC | 6 |

### P2 — missing nice (prototype screens not built; flow works without them)

| # | Issue | Approx LOC |
|---|---|---|
| P2-1 | `lockdown` UI — auto-close `list_open` on threshold; banner on /h/[token] when locked | ~120 LOC |
| P2-2 | `notifprompt` contextual nudge on /mytickets after RSVP confirmation | ~40 LOC |
| P2-3 | `escalate` button on door scanner failure states | ~60 LOC |
| P2-4 | `guestmessage` per-guest DM (single recipient broadcast variant) | ~80 LOC |
| P2-5 | `guesttierhistory` — read audit_log filtered to tier_upgraded action | ~50 LOC |
| P2-6 | `pasteventdetail` — replace /t/[token] when event ended with a "you attended" view | ~60 LOC |
| P2-7 | `postevent` / `posteventsummary` — thanks screen + send post_event_thanks SMS template (closes the never-fires gap) | ~80 LOC |
| P2-8 | `promotercompare` — side-by-side scorecard | ~120 LOC |
| P2-9 | `promoteronboard` — branded /holder/claim landing | ~60 LOC |
| P2-10 | `sharevent` — Web Share API button on /e/[eventId] | ~25 LOC |
| P2-11 | `smsdelivery` — /admin/sms log of broadcasts + individual sends w/ Twilio status (requires Twilio status webhook too) | ~150 LOC |
| P2-12 | `demomode` toggle — platform-owner switch to seed/reset demo data per-session | ~80 LOC |
| P2-13 | `dualctx` context switcher in nav | ~80 LOC |
| P2-14 | Wire `sms_templates` into outbound paths so non-default templates actually fire | ~50 LOC |
| P2-15 | Fire the 6 unused notification kinds (staff_assigned, billing_event, scan_failure_high, waitlist_promoted, guest_flagged, tier_upgraded) from their natural trigger points | ~40 LOC |
| P2-16 | Recurring event auto-create cron (`event_templates.cadence_days` is collected but never read) | ~80 LOC |
| P2-17 | Stripe Connect callback handler (close the half-stub) | ~100 LOC |
| P2-18 | Apple Wallet `.pkpass` byte-stream (PKCS#7 sig) | ~250 LOC + node-forge dep |
| P2-19 | Mobile QR codec (swap placeholder grid for `react-native-qrcode-svg`) | ~10 LOC + dep install |
| P2-20 | Mobile offline scanner queue (mirror web's localStorage flow) | ~120 LOC |

### P3 — polish

| # | Issue | Approx LOC |
|---|---|---|
| P3-1 | Remove `/owner/dashboard` vestigial route | -10 LOC |
| P3-2 | Clean dead PUBLIC_PATHS entries (`/api/cron`, `/api/embed`, `/api/webhooks` if no routes added) | ~5 LOC |
| P3-3 | Surface `/admin/guests` force-flag in UI | ~20 LOC |
| P3-4 | Apple Wallet 503 should land in a friendly /api/wallet/apple/[token] HTML page, not raw JSON | ~30 LOC |
| P3-5 | Owner who owns events should see "Door view" / "Manager view" links in the owner sidebar without typing URLs | ~10 LOC |
| P3-6 | Welcome wizard: resume-from-step-N when user comes back mid-flow | ~30 LOC |
| P3-7 | Welcome wizard step 3 for brand/individual: replace "Edit venues" with "Invite your first holder" | ~20 LOC |
| P3-8 | Co-owner permission label rename until enforced ("read_only" → "view-only", remove "edit" + "admin" choices) | ~15 LOC |

---

## Executive summary

The product **builds clean, deploys (after Vercel root-dir update), and runs end-to-end for a single owner running a single venue with one user-per-account**. That covers the brief's MVP scope and then some — Days 1–18 shipped 90 routes including bonus surfaces (Chat Hub AI, scorecards, calendar, embed widget, wallet passes, push notifications, sitemap, mobile scaffold).

**The two structural gaps that matter most:**

1. **Co-owner permissions are theater.** The product promises three permission tiers via UI labels and stores them in DB. RLS enforces zero of them. A "read-only" co-owner has the same write access as an "admin" co-owner: none. This will be discovered the first time a real venue group invites a manager and expects them to do anything.

2. **Account-type differentiation is decorative.** The brief defines venue/brand/individual as meaningfully different actor classes. The product changes a label and a routing fork — nothing else. A solo promoter and a venue ops team get the same dashboard, the same empty states, the same default event type.

**The biggest "feels incomplete" gaps:**

- 9 of 13 prototype-named screens not built; 4 partial. None of these break flows but each is a moment where a user expects something the product doesn't offer.
- 6 of 11 declared notification kinds never fire.
- SMS templates are CRUDable but unused at send time.
- No inbound webhook receivers (Twilio STOP, Stripe events) — both are documented gaps from prior days but stay listed here because they affect TCPA compliance and billing integrity respectively.
- Mobile is a scaffold with placeholder QR; not yet shippable to TestFlight.

**Build-quality observations (positive):**

- Routing guards are consistent: every owner/manager/door route uses the same helper functions; no hand-rolled auth checks.
- RLS is enabled on every table from Day 1; even though some policies are missing (co-owner writes), there's no "RLS off" hole.
- Error boundaries + skeletons + toast system + Cmd+K + onboarding wizard all real, not stubs.
- 90 routes, 16 migrations, npm workspaces clean, web build passes from `apps/web/`.

**Recommended action order before any new features:**

1. Fix Vercel Root Directory (P0-1) — unblocks deploys.
2. Fix co-owner permission enforcement OR remove the labels (P1-1).
3. Tighten `requireOwnerContext` (P1-2).
4. Differentiate account types meaningfully — start with `event_type` defaults + onboarding copy (P1-3).
5. Wire `/api/log/client-error` for anonymous + add rate limit (P1-4).
6. Add Twilio STOP webhook (P1-5).
7. Photographer in staff invite UI (P1-6).

After P0+P1, decide together which P2 screens are demo-blockers vs nice-to-have.
