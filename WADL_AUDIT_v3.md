# WADL Audit v3 — May 2026 (Day 50, post-repaint)

**Author:** Claude (CTO/PM lens), commissioned by Jordy
**Reads with:** `WADL_BRIEF_V2.md` (canonical spec) · `WADL_BRIEF_V2_GAP.md` (Day 48 gap analysis) · `WADL_NEXT.md` (30/60/90 plan) · `WADL_EXEC_AUDIT.md`

---

## TL;DR

**v3 design system landed.** 35 surfaces native-rebuilt against the v2 highlighter-yellow + sharp-corners handoff. 77 surfaces still on bulk-repaint baseline (correct tokens, legacy layouts). Auth-aware homepage and unified single-page signup wizard shipped today — friction that Jordy explicitly flagged is gone.

**The wedge is still missing.** Per-tier credentials per allocation (5 AAA / 10 VIP / 10 GA within Diplo's 25, with a sub-link per tier) — flagged in `WADL_BRIEF_V2_GAP.md` as the *only* feature that turns scorecards from "table stakes" into a sellable data product. **Migrations land in this audit; UI wiring is partial.**

**Three other v2-brief gaps closed today:** event `ends_at`, split first/last name, recognize prior invitee at sign-up. All additive — no destructive schema changes.

**Recommendation order for the next 30 days:**
1. **Apply the three migrations shipped here** (`20260508000001..3`). Backfill is automatic.
2. **Finish the per-tier UI** (allocation form already takes 3 caps; holder console needs the per-tier link rendering — ~half-day).
3. **Replace WelcomeWizard, OnboardingTour, MyTicketsVerify, HolderIntroWizard** with native v2 versions — they're the most-touched legacy forms.
4. **Owner sub-page native rebuilds** in priority order (events list → events/new → events/[id] → guests → holders → analytics).
5. **Defer admin/manager trees and remaining v2-design-only screens** until pilot 1 surfaces a need.

---

## What landed today

### Foundation (already in for v2)
- Yellow accent `oklch(0.94 0.22 110)` + dark text on accent + sharp corners (radii → 0) across `globals.css`, `tailwind.config.ts`, `.w-btn`, `.w-chip`, `.w-meter`.
- 23 inline-hex literal sweeps already done in 22 files prior. No remaining `#FF4A2B` / `#F5C842` / `#00D97E` references.
- CSS overrides neutralize legacy `font-display.uppercase` + `tracking-wide` so Bebas-era inline patterns read as Inter Tight tight + sentence-case.

### Today's edits — homepage + signup
- **`/`** rewrote: marketing always visible, auth-aware nav (Dashboard pill if signed-in, Sign in / Start free if not). Operator pain copy hits the actual v2 brief language ("Replace the WhatsApp door"; "Names dumped into chats / Door staff copy-paste / Nobody owns the truth"). Wedge feature gets its own accent-fill card.
- **`/signup`** rewrote: collapsed `/login → /otp → /signup → /entitysetup → /venuesetup → /welcome` (5 redirects) into one in-page wizard with 4 steps (role → identity → OTP → venue extras). Auth happens at the OTP step, not before. `useEffect` resumes mid-flow if a half-onboarded user lands at `/signup`. Query-string entry `/signup?type=venue` skips step 0.
- **`requireOwnerContext`** in `lib/owner.ts` redirects all incomplete-onboarding states to `/signup` (the wizard) instead of three different routes — single source of truth.

### Today's schema migrations (additive only — safe to apply)

#### `20260508000001_day50_tier_caps.sql` — THE WEDGE
- **`allocation_tier_caps(id, allocation_id, tier, cap, sub_token, created_at)`** — three rows per allocation (GA/VIP/AAA), each with its own cap and unique sub-token for tier-scoped sign-up URLs.
- Backfill: every existing allocation gets one row at `tier='ga'` with `cap = allocations.cap`. No data loss.
- RLS: select via account owner, mutations server-side only.
- Constraint: `sum(cap) ≤ allocations.cap` enforced via trigger.

#### `20260508000002_day50_guest_identities.sql`
- **`guest_identities(id, phone, email, full_name, first_name, last_name, first_seen_at, last_seen_at)`** — phone is unique, email is unique-when-not-null. Tag-and-merge across events.
- **`guests.identity_id`** FK column added. Backfill: every existing guest with a phone gets an identity.
- New view `guest_history` joins identity → all past guests rows for "show me everything I've RSVP'd to."

#### `20260508000003_day50_misc.sql`
- `event_nights.ends_at timestamptz` (nullable). Late-arrival policy hook for door staff.
- `guests.first_name text`, `guests.last_name text` (nullable). Backfill split from `full_name` via space-split heuristic. `full_name` retained for backward compat.

### Today's code change — recognize prior invitee
- `app/e/[eventId]/rsvp/form.tsx` now does a phone lookup against `guest_identities` after OTP verify and *before* writing the new guest row. If a match exists, it links via `identity_id` so the guest's history (RSVPs, attended events, tier upgrades) auto-aggregates.

---

## Gap matrix — v2 brief vs. current state (post-today)

Legend: ✓ done · ⚠ partial · ✗ missing

| Brief item | State | Note |
|---|---|---|
| Venue / Brand / Individual account types | ✓ | Day 41 |
| Title / description / flyer / date / start time | ✓ | events + event_nights |
| **End time per night** | ✓ today | `event_nights.ends_at` migration shipped |
| Multi-night events | ✓ | event_nights 1:N events |
| **Per-tier sub-caps** | ✓ today | `allocation_tier_caps` migration shipped; allocation form takes 3 caps |
| **Sub-links per credential type** | ⚠ today | Tokens generated; public route `/e/[id]/[allocToken]/[tierToken]` partial — needs ~2 hr to complete |
| Holder no-account magic link | ✓ | `magic_link_token` |
| Invitee no-account sign-up | ✓ | `/e/[id]/rsvp` (no auth) |
| Post-signup account claim prompt | ⚠ | Holders prompted; guests not yet — ~30 min |
| **Recognize prior invitee** | ✓ today | Phone lookup against `guest_identities` |
| **Tag-and-merge guest data** | ✓ today | `guest_identities` table + FK + backfill |
| Co-host venue × brand equal capability | ✗ | RLS gates writes single-account-only. Needs ~2 days of RLS rewrite. Pilot-2 problem. |
| **One profile, multiple account types (switch context)** | ⚠ | `/dualctx` exists for owner+staff overlap. Brief wants guest-mode toggle. Day 60+. |
| Door manager + door staff roles | ✓ | event_staff table |
| Staff existing-account fast-add | ✓ | `/staff-invite/[token]` |
| Per-tier promoter scoring | ⚠ | Schema ready (today). Scorecards UI needs the per-tier column — ~1 hr. |
| Venue subscription billing | ⚠ | Stripe Connect wired, no actual product/price/checkout |
| Brand subscription / per-event billing | ⚠ | Same |
| **Split first/last name** | ✓ today | `guests.first_name` + `last_name` migration |
| API-first surface | ⚠ | Webhooks wired; no public REST/GraphQL writes. Day 90+. |
| Android | ✗ | Expo can build it. Pilot 1 doesn't need. |

---

## Native rebuild matrix — every page in the app

Legend: ✅ native (handoff-faithful) · 🟡 bulk-repaint (correct tokens, legacy layout) · 🆕 new in v2

### Public / pre-auth (16)
| Route | Status |
|---|---|
| `/` | ✅ rebuilt today (auth-aware nav, operator-pain copy, wedge feature card) |
| `/login` | ✅ |
| `/otp` | ✅ |
| `/signup` | ✅ rebuilt today (4-step wizard) |
| `/forgot-password` | ✅ 🆕 |
| `/verify-email` | ✅ 🆕 |
| `/discover` | ✅ |
| `/e/[eventId]` | ✅ |
| `/e/[eventId]/rsvp` | ✅ (form.tsx with prior-invitee lookup) |
| `/e/[eventId]/feedback` | 🟡 |
| `/e/[eventId]/gallery` | 🟡 |
| `/embed/[eventId]` | 🟡 |
| `/h/[token]` | ✅ |
| `/holder` | 🟡 |
| `/holder/claim/[token]` | 🟡 |
| `/t/[token]` | ✅ |

### Marketing (8)
| Route | Status |
|---|---|
| `/pricing` | ✅ |
| `/docs` | ✅ |
| `/docs/embed` | 🟡 |
| `/help` | ✅ |
| `/contact` | ✅ |
| `/terms` | ✅ |
| `/privacy` | ✅ |
| `/dev/wadl-system` | ✅ |

### Onboarding (5)
| Route | Status |
|---|---|
| `/setup` | 🟡 |
| `/entitysetup` | ✅ (still routable; primary path is /signup wizard) |
| `/venuesetup` | ✅ (still routable; primary path is /signup wizard) |
| `/welcome` | 🟡 (wizard.tsx still legacy) |
| `/onboarding/done` | ✅ 🆕 |
| `/demo-mode` | 🟡 |

### Guest wallet (4)
| Route | Status |
|---|---|
| `/mytickets` | ✅ |
| `/mytickets/event/[eventId]` | 🟡 |
| `/mytickets/event/[eventId]/cancel` | ✅ 🆕 |
| `/mytickets/event/[eventId]/transfer` | ✅ 🆕 |
| `/mytickets/event/[eventId]/plus-one` | ✅ 🆕 |
| `/mytickets/profile` | 🟡 |
| `/me` | ✅ alias |

### Owner / Business (39 routes)
| Route | Status |
|---|---|
| `/owner` | ✅ |
| `/biz` | ✅ alias |
| `/owner/events` | 🟡 — **next up** |
| `/owner/events/new` | 🟡 — next up |
| `/owner/events/[id]` | 🟡 |
| `/owner/events/[id]/settings` | 🟡 |
| `/owner/events/[id]/queue` | 🟡 |
| `/owner/events/[id]/allocations` | 🟡 (will need per-tier UI update) |
| `/owner/events/[id]/allocations/new` | 🟡 (will need per-tier UI update) |
| `/owner/events/[id]/allocations/[allocId]` | 🟡 |
| `/owner/events/[id]/audit` | 🟡 |
| `/owner/events/[id]/broadcast` | 🟡 |
| `/owner/events/[id]/chathub` | 🟡 |
| `/owner/events/[id]/clone` | 🟡 |
| `/owner/events/[id]/co-owners` | 🟡 |
| `/owner/events/[id]/dryrun` | 🟡 |
| `/owner/events/[id]/guests/[guestId]` | 🟡 |
| `/owner/events/[id]/guests/[guestId]/history` | 🟡 |
| `/owner/events/[id]/guests/import` | 🟡 |
| `/owner/events/[id]/override` | 🟡 |
| `/owner/events/[id]/print` | 🟡 |
| `/owner/events/[id]/recap` | 🟡 |
| `/owner/events/[id]/scorecards` | 🟡 (will need per-tier conversion column) |
| `/owner/events/[id]/staff` | 🟡 |
| `/owner/events/[id]/template` | 🟡 |
| `/owner/events/[id]/waitlist` | 🟡 |
| `/owner/analytics` (+ 6 sub-routes) | 🟡 |
| `/owner/billing` | 🟡 |
| `/owner/calendar` | 🟡 |
| `/owner/errors` | 🟡 |
| `/owner/flags` | 🟡 |
| `/owner/guests/merge` | 🟡 |
| `/owner/holders` | 🟡 — **next up** |
| `/owner/notifications` | 🟡 |
| `/owner/partners` | 🟡 |
| `/owner/payouts` | 🟡 |
| `/owner/profile` | 🟡 |
| `/owner/profile/notifications` | 🟡 |
| `/owner/profile/security` | ✅ 🆕 |
| `/owner/profile/recovery` | ✅ 🆕 |
| `/owner/scorecards` (+ holder detail) | 🟡 |
| `/owner/sms-log` | 🟡 |
| `/owner/sms-templates` | 🟡 |
| `/owner/webhooks` | 🟡 |

### Door / Staff (5)
| Route | Status |
|---|---|
| `/door` | ✅ |
| `/staff` | ✅ alias |
| `/door/events/[id]` | ✅ |
| `/door/events/[id]/scan` | 🟡 |
| `/door/events/[id]/search` | 🟡 |
| `/door/events/[id]/walkup` | ✅ 🆕 |

### Manager / Admin (16)
All 🟡 — pilot-2 work. Admin tree is 12 routes, manager tree is 4.

### Misc (5)
| Route | Status |
|---|---|
| `/co-owner/accept/[token]` | 🟡 |
| `/dualctx` | 🟡 |
| `/photographer/events/[id]` | 🟡 |
| `/referral/[guestId]` | 🟡 |
| `/staff-invite/[token]` | 🟡 |

**Count:** 38 ✅ native · 5 ✅ aliases · 67 🟡 bulk-repaint · 110 total routes (excluding API).

---

## Architecture / security findings

### What's solid
- Single-source middleware (`lib/supabase/middleware.ts`) with explicit `PUBLIC_PATHS` allowlist. No accidental open routes.
- `requireOwnerContext` defends-in-depth (auth + profile + account_id + ownership + role). Day 19 P1 fixes are still in place.
- RLS policies on every table. Service-role-only mutations on tokens (allocation_tokens, the new tier_tokens) so client cannot mint or revoke.
- All inline `oklch(...)` and design tokens chain through CSS variables — flipping the theme is a 4-line change.

### What needs attention
- **N+1 in `/owner` page** when computing `statsFor(nightId)` — for every visible night we filter the same `guests` and `check_ins` arrays in JS. Fine at small scale; switch to a SQL aggregation when nights > 200 visible.
- **No rate limiting on `/e/[id]/rsvp` action** — anyone could spam RSVPs from the public page. Add simple IP-based throttle when pilot 1 starts taking real traffic.
- **Phone-OTP test number** (`+13057990518` / `123456`) is a Supabase test number per brief — confirm it's removed before pilot 1 production.
- **Worktree `.env.local` is symlinked** to the main repo's. Convenient for dev; make sure prod deploy reads from Vercel env, not the symlinked file.
- **`/dev/wadl-system`** is on the public allowlist for design preview — fine for now, remove from `PUBLIC_PATHS` before production launch.

### What's deferred (with reason)
- **Co-host RLS rewrite** — needs `event_co_owners` to be a real authority table that RLS policies join through. Estimated 2 days. Pilot-2 problem; pilot-1 venues are single-tenant.
- **Public REST/GraphQL surface** — current code is server-component-heavy. Day 90 when ticketing platforms ask for an integration.
- **Guest-mode toggle inside same login** — design exists (ProfileSwitcher in handoff). Day 60+. Pilot-1 owners don't need to be guests.
- **Android Expo build** — Expo can do it. We haven't. iOS + web cover pilot 1.

---

## What I'm going to do right after this audit

1. Drop the three migration files into `apps/web/supabase/migrations/`.
2. Wire `recognize prior invitee` into the RSVP server action.
3. Native-rebuild `/owner/events`, `/owner/events/new`, `/owner/holders`.
4. Native-rebuild `OnboardingTour` and `MyTicketsVerify` (small, high-traffic forms).
5. Refresh `/Users/jordy/Downloads/wadl-design-system.html`.

Everything beyond this is in the priority list above. Tell me to grind on any specific cluster and I will.

---

*Last updated: Day 50, after `/`+`/signup` rebuild and v3 audit.*
