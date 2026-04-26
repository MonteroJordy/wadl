# WADL — Full Audit

**Date:** 2026-04-26 · **Production commit:** `c8362bd` (Days 25-28) · pre-Day-30 deploy

This document is brutal. It's meant to be. The product has been shipped fast over 30 days. Most of the moving parts work in isolation. The whole does **not** yet feel like an app. This audit explains why, ranked by what actually matters, by discipline.

---

## Executive summary (COO lens)

WADL has 117 web routes, 33 Postgres tables, an Expo iOS scaffold, and a working prod deploy at `wadl-pearl.vercel.app`. Functionally, the door-running primitives are real: phone-OTP auth, allocation magic links, QR scanner, approval queue, recap, feedback, demo mode, dualctx, escalate, recurring-events cron, Stripe Connect callbacks. **None of that matters if the product doesn't feel like a product.**

The critical gap right now is **product cohesion**, not feature completeness. Specifically:

1. Until Day 30, every public surface rendered as a 375px-wide column on a 1520px viewport — content marooned in black void. Day 30 is the first run that addressed this, and it only fully redesigned 13 surfaces. ~30 internal pages (allocations, scorecards, settings, manager, admin sub-tabs) are still phone-column-on-desktop.
2. Several declared integrations (Twilio, Stripe Connect, VAPID push, Resend email, Anthropic Chat Hub, Apple Wallet) have **zero env vars set in production**. The code is deployed, but the features they enable silently no-op. A new owner gets through onboarding and reaches `/owner` with an account that **cannot actually send SMS, accept payments, or fire pushes**.
3. The production database was 11 migrations behind the codebase until 2026-04-26. Anyone hitting `/owner/sms-log` or `/owner/payouts` before that day was getting silent 500s. The fact that no one noticed for 11 commits is itself a signal: there's no one really using this yet.
4. There's no analytics, no error monitoring (Sentry stub only), no crash reporting on mobile, no acquisition pipeline, no sales motion, no pricing page that says actual numbers.

**Operationally, WADL today is a polished demo, not a business.** A first paying customer would surface 30+ rough edges in an hour. To get there: pick three real venues willing to test, dogfood for two weekends, and triage the resulting bug list relentlessly. That's a different mode from feature-shipping.

### The three things that would change "feels like an app" the most

1. **Run a real night with WADL on it.** Every major SaaS that "felt right" on day 1 had been used by its founder + 3 friends 50 times before launch. The fastest way to find what's missing is to use it for a real Friday.
2. **Pick a vertical and invest.** Right now WADL is "guest list app" generally. The prototype's voice ("door, handled" / "one door, one truth") is sharp but the product surface is generic. Pick "Miami nightclubs" or "brand activations" and tune copy + screens to that customer.
3. **Cut features that aren't load-bearing.** Internal CMS, photographer role, Stripe Connect, recurring events, .ics calendar links, web push, embed widget, Wallet passes — every one of these has been built; none of them are validated. They should be feature-flagged off until a customer asks.

---

## Product / PM lens

### Brief vs. shipped — what actually exists

The original 7-day MVP scope is **all** built and exceeded. The brief listed:

| Area | Status |
|---|---|
| Auth (OTP, email, signup, entitysetup, venuesetup) | ✅ Shipped |
| Owner weekview + daydash | ✅ Shipped (redesigned Day 30) |
| Create event multi-night | ✅ Shipped |
| Allocations + magic links + holder page | ✅ Shipped |
| Guest RSVP + SMS QR + my tickets | ✅ Shipped |
| Door scanner + 4 fail states | ✅ Shipped |
| Approval queue + audit log | ✅ Shipped |
| Owner dashboard + basic analytics | ✅ Shipped + expanded |
| Chat Hub AI | ✅ Shipped (Day 12) |
| Co-owner invite | ⚠️ Stored but write-RLS never enforced (Day 19 audit caught) |
| Promoter scorecards | ✅ Shipped |
| Clone event | ✅ Shipped |

Beyond MVP, the v1.1 list was also built (CSV import, multi-venue, tier upgrades, billing portal stub, etc.) plus a pile of v1.2 work (SMS log, web push, recurring events, Apple Wallet stub, embed widget, mobile app scaffold, internal CMS, etc.).

### Where the brief was wrong

The brief said "v1.1 features will not be built until MVP is green by Day 6." That order was reversed — features sprinted ahead of polish. The result is the current state: lots of features, low cohesion. **The brief should be re-read in 2026-Q3 and at least four bullets ("internal CMS," "photographer," "Stripe Connect," "Apple Wallet") should be feature-flagged off the production build until a customer asks.**

### Roadmap vs. reality (what's promised but not delivered)

| Surface | Promised in brief / prototype | Reality |
|---|---|---|
| Co-owner with `edit` / `admin` permission tiers | UI labels still suggest 3 tiers | Day 19 audit pinned all to `read_only`; UI is now honest |
| Stripe Connect promoter payouts | "Promoter payout flow via Stripe Connect" feature flag | OAuth callback + webhook shipped Day 25; **no env vars set** |
| Recurring events | `cadence_days` + cron worker | Cron worker shipped Day 25; **no template has cadence > 0 in prod** |
| Apple Wallet `.pkpass` | Add to Wallet button on /t/[token] | Returns 503; `passkit-generator` not installed |
| Push notifications (web) | VAPID-signed Web Push | Code shipped; **`VAPID_*` env vars not set** |
| Push notifications (mobile) | Expo push tokens | Code shipped Day 18; mobile never npm-installed in prod |
| Twilio inbound STOP | TCPA receiver | Shipped Day 19; **no Twilio number configured for prod** |
| Twilio status callback | Delivered/failed pills | Shipped Day 25; needs Twilio config |
| Chat Hub AI | Claude API parses name dumps | Shipped Day 12; **`ANTHROPIC_API_KEY` not set in prod** |
| Internal CMS | `/admin/*` for platform owner | 8 pages shipped; **read-only registries, no admin actions wired** |
| `pasteventdetail` (prototype-named) | Read-only past event view | The recap page covers it; the standalone screen wasn't built |
| `dualctx` full multi-context | Owner-as-staff, guest-also-staff | Owner+staff shipped Day 27; guest+staff edge case unbuilt |
| `escalate` UI variants | Per-role escalation flows | Door-staff variant shipped; manager-side reception UI is just push+SMS |
| `smsdelivery` admin | Per-message Twilio delivery view | Status callback updates `sms_log`; no `/admin/sms-delivery` UI |
| `promoteronboard` wizard (full 5-step) | Per the prototype | Day 28 shipped a partial; prototype's "scoreboard preview / plus-one mechanics" not done |
| `demomode` toggle | Sales-call ready | Day 28 banner + cookie shipped; doesn't actually swap dataset |

**Net:** Most "shipped" features have shipped *code*, not *configuration*. The product needs a **Configuration Day** where every integration env var gets filled and tested against a live account.

### Onboarding flow audit

Current path: `/login` → OTP → `/signup` → `/entitysetup` → `/venuesetup` → `/welcome` (5-step wizard) → `/owner`

That's **6+ screens** between intent and first useful action. The brief said "5 minutes to first guest list." Reality is 6 forms followed by an empty weekview that says "No nights this week." Each step is fine in isolation but the overall flow drags.

**Friction points:**

- Phone OTP requires a working SMS provider. With no Twilio creds, **prod owner signup is broken** until they switch to email magic link mid-flow. There's no detection of this.
- `/signup` asks for full name only. Then `/entitysetup` asks for account name. Then `/venuesetup` asks for venue name. Three near-identical text fields could be one screen.
- `/welcome` wizard has 5 steps and most repeat what the previous screens already collected. Cognitive overhead.
- After onboarding, the `/owner` empty state's CTA is "+ Create event" — but a brand-new owner doesn't have a venue connected to events on certain account types. Path forward is unclear.

**Recommendation:** Compress to `/login` (or `/signup`) → OTP → single `/setup` page (account name + type chips + venue name + first event seed in one form) → `/owner` with the event already created. **Three screens, two minutes.**

### What pages are MISSING (not just broken)

From the prototype's 166 screens (per Day 19 audit), these named screens have no equivalent in production:

- `dualctx` for guest+staff edge case
- `escalate` reception UI for managers
- `guestmessage` (per-guest blast composer)
- `guesttierhistory` standalone view
- `pasteventdetail` (recap covers most of it)
- `posteventsummary` with feedback NPS gating
- `promotercompare` two-up holder analytics
- `sharevent` link copy + image generator
- `smsdelivery` admin per-message status
- `demomode` data-swap (only the banner shipped)
- Real-night clock + capacity countdown header (the most-cited "I miss this when I'm at the door" item)
- Door manager standalone "page received" UI
- A guest-side referral leaderboard
- A holder mobile-native screen (currently web-only at `/h/[token]`)

That's 13+ named screens missing. Each one is small (1-3 hours) but they add up.

---

## UX / Information Architecture lens

### The biggest UX gaps

**1. There's no global `Home` button.** Click into any sub-route (e.g. `/owner/events/[id]/allocations/new`) and the only way out is the browser back button or guessing the right sidebar item. A persistent top breadcrumb would solve this. The owner sidebar partially mitigates but only on `/owner/*`.

**2. The role-switching mental model is fragmented.** Owners see one nav. Door staff see another. Guests see another. There's no "I am simultaneously an owner of venue X and a door manager for tonight at venue Y" UI on the web. The Day 27 dualctx is a one-time picker; after that you live in one shell with no way to flip without signing out. **Add a persistent "context" pill in the top bar.**

**3. The discover → RSVP → ticket → check-in journey works, but nothing tells the guest what just happened.** After RSVP they see "Status: pending" with no explanation of what gets approved, when, or what to do. A guest-facing "what happens next" card after each step would close the loop.

**4. Notifications are inconsistent across surfaces.** The bell badge at the top right shows unread count for owner notifications. But the mobile app has its own notifications screen. The two never converge — read on web, still unread on mobile (or vice versa). **The notifications table needs realtime sync OR a polling refresh.**

**5. Search is everywhere and nowhere.** The owner sidebar has a "Search…" affordance (Cmd+K command palette). The weekview also has a search input. The mobile app has no search at all. The admin pages have no search. Pick **one** search — Cmd+K — and route everything through it.

**6. Empty states have improved on the redesigned pages but are still bureaucratic on most internal pages.** "No SMS yet" / "No allocations yet" / "Nothing flagged" are factual but not directional. Each empty state should answer: *what should I do right now to fix this?*

**7. Capacity countdown clock is missing.** The biggest single UI miss vs. the prototype. Owners working a real door look at "how much room is left" every 30 seconds. The prototype has `184 / 312 cap` with a visual fill bar. Production has the numbers but no fill, no countdown, no "at capacity in 12 minutes at this rate" projection.

**8. There's no "lockdown timeline" or "freeze schedule" UI.** The brief mentions per-holder auto-close times. The schema supports `lockdown_threshold_pct`. The UI doesn't surface either as a planning artifact — owners can only see them per-event mid-flight.

### Information architecture — what's mis-shelved

- `/owner/sms-templates` is in "Account" sidebar section. It's actually used per-event during a broadcast. Better placed under the event.
- `/owner/holders` is "cross-event holder roster," but `/owner/scorecards` is "cross-event holder show rates." These are the same dataset, two views. Should be a single page with a toggle.
- `/owner/calendar` exists but never linked from the weekview. Hidden gem.
- `/admin/*` has 8 sub-routes for the platform owner. None of them are linked from the operator's normal nav (correctly — they're for the platform admin, who in this case is also the operator).
- `/photographer/events/[id]` is a half-shipped page with no role onboarding. If it's not actively used, hide it.

### Navigation patterns are inconsistent

Owner pages use a left sidebar (`AuthedShell`). Guest pages use a sticky top bar (Day 30 redesign). Door staff pages use no chrome (just back link). Manager pages use a third pattern. Auth pages used a 4th. This is the single biggest reason it "doesn't feel like an app" — there's no consistent shell.

**Recommendation:** Two shells, no exceptions.
- `<PublicShell>` — sticky top bar with WADL wordmark + signed-in CTA (Tonight / Sign in / My tickets) — used on `/`, `/discover`, `/e/[id]`, `/t/[token]`, `/mytickets`, `/pricing`, `/privacy`, `/terms`.
- `<AuthedShell>` — sidebar + sticky top — used on `/owner/*`, `/manager/*`, `/door/*`, `/photographer/*`, `/admin/*`, `/holder/*`.
- Auth pages use neither (intentional — focused single-task flows).

This is doable in 1 day of focused work and would touch 60+ routes.

---

## UI / Design lens

### Fidelity to prototype (`nightops_platform.html`)

The prototype is a 6244-line HTML file with 96+ screens, designed against the brief's specific aesthetic: very dark (#0a0a0a body), Bebas Neue display, Epilogue body, DM Mono monospace, coral-only accents (#FF4A2B), gradients only on avatars.

**What's fidelity-correct:**
- Color tokens (`--bg`, `--coral`, `--gold`, `--mint`, `--lav`, `--cream`, `--muted`, `--line`) match the brief.
- Typography stack is right.
- Mobile frame at 375px width is intentional.

**What drifts:**
- Spacing is generally too tight on desktop. The prototype has more breathing room around hero elements.
- Card padding is inconsistent — `p-4` here, `p-5` there, `p-6` elsewhere. Should be 3 sizes max (`card-sm`, `card`, `card-lg`).
- Border-radius values vary: `rounded-md`, `rounded-lg`, `rounded-2xl`, `rounded-full` all used. The prototype is mostly `lg` and `2xl`.
- Button widths drifted: `btn-primary` is `w-full`, which made every primary CTA banner-sized until Day 30. New convention: full-width inside forms only; everywhere else use `inline-flex` pills.
- Coral usage drifted toward decoration. The brief said "coral-only accents." In production, coral is on borders, backgrounds, links, buttons, badges, dividers. **Pick three uses for coral and stop.** (Suggestion: primary buttons, brand wordmark, "live" / urgent state indicators.)

### Design system gaps

There are CSS variables. There are a few component classes (`.mobile-frame`, `.display-lg`, `.label-mono`, `.input-dark`, `.btn-primary`, `.btn-ghost`, `.card`). That's it. There's **no real design system** — no documented type scale, no spacing scale, no elevation system, no animation tokens, no icon library, no documented components.

What's missing:
- **Type scale** — currently `display-xl` / `display-lg` / nothing-in-between / `label-mono`. Need at least 6 steps.
- **Spacing scale** — currently uses Tailwind's defaults; no semantic names.
- **Elevation** — there's no shadow vocabulary. Cards have flat borders. Hover/active states aren't differentiated.
- **Animation tokens** — Day 30 added a page fade. There's also `animate-skeleton` in tailwind config. No standard "in/out" duration or easing.
- **Icon library** — the codebase uses inline SVGs everywhere. Some are 14×14, some 16×16, some 24×24, with different stroke widths. Should be one library (Lucide is already in mobile package; web could add it).
- **Component library** — `<Card>`, `<Button>`, `<Input>`, `<Pill>`, `<StatusBadge>`, `<Avatar>`, `<EmptyState>` should all be real React components. Today some are JSX patterns repeated across files.

**Recommendation:** A 2-day "design system day" that produces `apps/web/components/ui/*.tsx` with proper typed components and a `docs/design.md` reference. This pays back across every future page.

### Specific UI patterns that should die

- The "card with three labels stacked" pattern that appears on `/owner/profile`, `/owner/billing`, `/owner/payouts`, settings pages — repetitive, low-information density. Needs proper key/value table component.
- Inline `style={{}}` props for one-off colors. Move to Tailwind variants.
- `text-coral text-coral hover:brightness-125` — should be a `link-coral` utility.
- Date strings rendered manually (`fmtDate`/`fmtTime`) — should be `<RelativeTime>` component with consistent formatting.

### Mobile (Expo) UI

Mobile uses NativeWind (Tailwind for React Native) with the same color tokens. **Patterns are inconsistent with web** — e.g. mobile uses `bg-mint` for active CTAs (door scanner), web uses `bg-coral` for primary actions. Pick one.

Mobile also lacks:
- **Bottom-tab redesign** — current tabs are basic and don't carry brand identity. Prototype shows app-icon-style tabs with badges.
- **Sheet modals** — the EscalateButton uses an inline expansion pattern; should be a real bottom sheet for "feels native."
- **Haptics** — zero feedback on tap. Should fire on scan-success, on approve, on escalate-sent.
- **Pull-to-refresh** — only on dashboard. Should be everywhere a list lives.
- **Skeleton loaders** — none on mobile. Web has a basic skeleton class.

---

## Engineering lens

### Tech debt

- **Two test files in the entire repo** (search shows no `*.test.ts` or `*.spec.ts` matches). For a 30-day-old codebase with 117 routes, this is structural risk.
- **No CI** beyond Vercel's auto-build. No lint check on PR (because there are no PRs — straight-to-main).
- **Type safety is good** — `tsc --noEmit` runs clean on every push. But `as unknown as` casts are scattered through the codebase, often masking shape mismatches.
- **No error monitoring** — Sentry is referenced as a stub but not wired. Production errors go to `console.error` and the `error_log` table.
- **No client-side error boundary on guest flows** — `/discover`, `/e/[id]` would render a blank page on a thrown error. There's an `error.tsx` boundary but it's not visually app-coherent.
- **Database queries are mostly direct from server components.** No query layer, no caching, no batching. RLS handles authz correctly but every page makes 3-8 round-trips. Acceptable today; will hurt under load.
- **Service-role admin client (`createAdminClient`) is used liberally** to bypass RLS. Every use is a potential bypass bug. Should be audited and minimized.
- **No rate limiting on most public-facing endpoints.** `lib/rate-limit.ts` is in-memory, per-process — Vercel cold starts reset it.
- **Mobile app has no end-to-end test path.** Detox / Maestro not configured. Manual smoke test only.

### Security

- **RLS is on every table from Day 1** — good baseline.
- **Co-owner write enforcement is theater** — Day 19 caught this and pinned the UI to read-only. The schema still allows other tiers; future migration needs to lock down INSERT/UPDATE/DELETE policies.
- **Stripe webhook signature validation is correct** for Connect but not yet for the existing `/api/billing/checkout` flow (which is a stub).
- **Twilio signature validation** is correct on both inbound webhooks.
- **Magic link tokens** are 24-byte random; 192 bits of entropy. Good. But there's no rate limit on the holder add endpoint, so a leaked token can be brute-forced for guest data.
- **Admin pages (`/admin/*`) gate via `profile.email === "jmontero@mainframeagency.com"`** — hardcoded email is fragile. Should be a `is_platform_admin` boolean on profiles.
- **No CSRF protection** on server actions. Next.js 14 server actions have built-in protection but it's worth verifying.
- **Image uploads (flyers)** go to Supabase storage with public URLs. No virus scanning, no content moderation. Acceptable for now; document.

### Database

- **33 tables, 19 migrations.** Reasonable for the scope.
- **No migrations table tracking** — Supabase dashboard shows "No migrations" because these are run manually via SQL Editor (Day 26 audit revealed this). Should be using `supabase db push` from CI.
- **Indexes are mostly there** but a few hot-path queries lack them (e.g. `events.account_id, created_at` for the weekview).
- **No partitioning, no archive table** — guest table will grow unbounded. Each event is ~200 guest rows; at 50 events/year that's 10k/year per venue. Manageable.
- **Audit log is unbounded.** Day 12 added a retention cron stub — should be activated.
- **`event_feedback.tags` is `text[]`** — works for now; if tag set grows, normalize.

### Performance

- **No bundle analysis** — `next build` shows route sizes but not dep weight.
- **Server components are the default** — good.
- **Some routes blow past 150 kB First Load JS** — `/co-owner/accept/[token]` (157 kB), `/door/events/[id]/scan` (212 kB), `/owner/analytics/tonight` (157 kB), `/staff-invite/[token]` (158 kB). The scanner is justified (zxing). The others are likely importing too much shared.
- **No image optimization** — flyers render at full size. `next/image` is not used.
- **No CDN cache hints** — every render is dynamic. Realistically fine for this traffic shape.

### Mobile

- **Expo SDK 51, RN 0.74** — current at time of build but will lag soon.
- **No `eas.json` profile for staging** — only preview + production exist.
- **`react-native-qrcode-svg` is in package.json but `npm install` hasn't been run on the deploy machine.** Mobile is not actually shippable to TestFlight today.
- **No Apple Developer enrollment** ($99/year).
- **Push tokens are stored** but the mobile root layout doesn't refresh them on app launch.

---

## Operations lens

### To run a real night with WADL today, you need:

1. **A configured Twilio account** — none currently. SMS sends are no-ops in prod. Cost: ~$15 setup, ~$0.0079/segment ongoing.
2. **A real phone number registered for A2P 10DLC** — required for US carrier delivery of the OTP messages. ~2 weeks to register.
3. **A working email path** — Resend env vars are missing. SMS-via-email fallback isn't possible.
4. **A real venue test** — current testing is the founder + the demo seed. Need 3 actual venues willing to test.
5. **A bouncer / door staff trained for 5 minutes** on the scanner. The UI is good but the failure modes (offline, expired QR, do-not-admit) need a printed cheat sheet on day 1.
6. **A backup plan when WiFi at the venue fails.** The Day 27 offline scan queue handles this on mobile, but the web scanner doesn't have an equivalent.

### Customer support / runbook

There's no support pipeline today. No `/help` page, no `/contact`, no in-app chat. The footer links to `/privacy` and `/terms` only. Running a real night means a panicked text at 11pm — there's no path for that to reach you.

### Billing / monetization

- `/owner/billing` is a stub.
- `/owner/payouts` is a stub (Stripe Connect not configured).
- `/pricing` page exists but doesn't have actual prices on it.
- No Stripe Customer is created for new accounts.
- The whole product is free-to-try indefinitely.

**The shape of the business model is the most important COO question and is currently undefined.** Decide: is this a SaaS subscription per venue, a per-head transaction fee, a free tier + paid Connect payouts cut, or some hybrid? This decision rewires 5+ surfaces.

### Ops gaps you'll feel on the first real night

- No "delete this event" confirmation — accidental deletes are silent.
- No "undo last scan" — if the bouncer misclicks, the entry is logged.
- No "broadcast all approved guests" with per-night constraint — broadcast component exists but doesn't validate which night.
- No "show me everyone whose phone gave a Twilio undelivered" — sms_log shows it, but there's no aggregate "20% of your guests didn't get the QR" alert.
- No printed list export with QR thumbnails — only CSV. Some doors prefer paper backup.
- No way to reassign an allocation mid-event if a promoter doesn't show.
- No way to merge two duplicate guest entries from the door.

---

## Mobile (iOS) parity lens

The mobile app is intentionally scoped to: door scanning, owner glance, guest RSVP. Cross-event admin is web-only. That's a defensible product decision but the gaps still confuse:

**Mobile has, web also has:** discover, my tickets, ticket detail, owner dashboard (limited), notifications, approval queue, door scanner, dualctx, escalate, recap.

**Web has, mobile lacks:** allocations CRUD, scorecards, analytics (all 7 sub-views), broadcasts, Chat Hub, guest list search/approve/manual add, override, lockdown, holder claim flow, owner profile/settings, billing, payouts, audit log, co-owner invite/accept, event templates, CMS, error log, calendar.

**That's not a bug list — that's a product positioning question.** Are these meant to come to mobile eventually, or is mobile intentionally "during-the-night-only"? If the latter, the mobile profile screen should explicitly say so: "Settings, allocations, and analytics live on the web — you're holding the door tool."

---

## Accessibility lens

- **Skip-to-content link** is present and focus-visible. ✅
- **Focus rings** are present on all interactive elements. ✅
- **`prefers-reduced-motion`** is honored for all animations. ✅
- **Color contrast** — coral on bg passes WCAG AA. Muted-on-bg (rgba(242,237,228,0.5)) passes AAA on body but is too dim for fine print at small sizes.
- **Keyboard navigation** works on the redesigned pages. The mobile-frame pages are technically navigable but the focus order on auth wizards is brittle.
- **Screen reader** — most images lack alt text. Flyers are `alt={event.name}` only. SVG icons have no aria-label.
- **Form labels** are mostly correct (visible label + `htmlFor`). A few are inferred-only.
- **No `axe-core` CI** — manual audit only.
- **The QR display on `/t/[token]`** has no text equivalent for blind users. Should display the token + the human-readable name + venue + doors at next to it.

**P1 a11y items:** alt text on all imagery, aria-labels on icon-only buttons, axe-core in CI.

---

## Performance lens

- **First Contentful Paint** — not measured.
- **Largest Contentful Paint** — likely the flyer hero on `/e/[id]` and `/discover`. No `next/image`, no `priority` hint.
- **Time to Interactive** — fine on most pages; the scanner page is heaviest at 212 kB JS.
- **Cold starts** on Vercel are unmeasured; for a rare-traffic app this matters less than for a high-traffic one.
- **Database query count per page** — the weekview makes 4-5 queries; could batch via a stored function.
- **Realtime** — the weekview uses polling refresh (`force-dynamic`). RealtimeCounters component uses Supabase Realtime on the daydash. Inconsistent.

**P2 perf items:** swap to `next/image` for flyers, add a `force-cache` policy for the public landing, add Vercel Edge cache for `/discover` (5-minute TTL).

---

## Copy / voice lens

The brief's voice is sharp: **"Door, handled."** "One door, one list, one truth." "Stop losing the door to chaos."

In production, that voice drops in three places:

1. **Empty states.** "Nothing flagged yet" / "No allocations yet" / "No scorecards data" — bureaucratic. Should sound like the brand: "No flags. Quiet door tonight." / "No promoters yet — drop a holder a magic link." / "Run a night, then come back."
2. **Microcopy on form fields.** "Enter the code you received." / "Save changes." — generic. Could be "Tap in the six." / "Lock it in."
3. **Marketing pages.** `/pricing` and `/privacy` are fine. `/terms` is boilerplate.

The Day 30 redesigns are tighter on voice. The 30 internal pages still use generic admin copy.

**P2 copy item:** A 1-day "voice pass" that rewrites every empty state, button label, and microcopy line to sound like the founder (you).

---

## Prioritized roadmap

### P0 — must do this week (each is < 1 day)

1. **Configure prod env vars.** Twilio (SID, token, messaging service, from number), Stripe (secret, webhook secrets), VAPID (public + private), Anthropic (API key), Resend. Without these, half the product is no-op.
2. **Run a real night.** Pick one Friday at one venue. Use WADL end-to-end. List bugs as they surface.
3. **Compress onboarding to 3 screens.** Login → OTP → unified setup → /owner with seed event.
4. **Standardize page chrome.** Two shells (`<PublicShell>`, `<AuthedShell>`), zero exceptions. Every route uses one or the other.
5. **Capacity countdown on the daydash hero.** Visual fill bar + projected-at-capacity time.

### P1 — within two weeks

6. **Owner sub-routes redesign sweep.** ~30 pages still on `mobile-frame`. Apply the new wider container + chrome + voice.
7. **Pricing decision + page.** Decide the model. Put real numbers on `/pricing`.
8. **Apple Wallet `.pkpass` real bytes.** Install `passkit-generator`, ship the cert pipeline.
9. **Mobile "during-the-night" framing.** Explicitly scope the mobile app + add Settings link explaining web-side admin.
10. **Search consolidation.** Cmd+K everywhere; remove redundant search inputs.
11. **Notifications realtime sync** between web + mobile. Polling refresh as a fallback.
12. **Empty state voice pass.** Every empty state gets a one-line founder voice rewrite.
13. **Add `/help` and `/contact`.** Even just an email link + 5 FAQs.
14. **Fix `/owner/sms-templates` write path** so templates actually fire on broadcast.

### P2 — within a month

15. **Design system module** (`components/ui/*` + `docs/design.md`).
16. **Animation system** — list stagger, count-up, toast slide, sheet modals.
17. **Lucide icons** throughout web. Match mobile.
18. **`/admin` real CMS** — actions wired, not just registries.
19. **Mobile native polish** — bottom sheets, haptics, pull-to-refresh everywhere, real bottom-tab redesign.
20. **Co-owner write tier enforcement** — schema-level RLS for `edit` and `admin` permissions. Re-enable the 3-tier picker.
21. **Recurring events activation** — write a UI to set `cadence_days` and verify cron fires.
22. **Stripe Connect end-to-end** — onboarding flow + payout receipt.
23. **axe-core in CI.**
24. **Bundle audit.** Strip the 150kb+ outliers.
25. **Sentry / error monitoring.** Real wiring, not stub.
26. **Page transitions library** (Framer Motion or similar) for between-route choreography.
27. **A real test suite.** Vitest for utilities, Playwright for the three core flows.
28. **`pasteventdetail` standalone screen + the rest of the missing-from-prototype screens.**
29. **`promoteronboard` full wizard** with scoreboard preview.
30. **`smsdelivery` admin per-message view.**

### P3 — backlog (nice but not urgent)

31. Multi-language (Spanish for Miami).
32. Apple Push (APNs) direct fallback when Expo unavailable.
33. Wallet integrations (Google Pay, Samsung Pay).
34. Photographer portal full feature set.
35. CSV → Chat Hub paste shortcut.
36. Owner-side RSVP heatmap by hour-of-day.
37. Scrobbler / Last.fm-style "what played when" log.
38. Tiered subscription with usage metering.

---

## What to do *first* (next session priorities)

If you read nothing else, read this:

1. Configure env vars (P0-1).
2. Compress onboarding to 3 screens (P0-3) — this is where every new owner judges the app in 60 seconds.
3. Capacity countdown clock + visual fill bar (P0-5) — the single most-cited "I miss this from the prototype."
4. Standardize chrome (P0-4) — kills the "every page feels different" symptom.
5. Run a real night (P0-2). Nothing replaces this.

Everything else can wait. Most of P2 + P3 will get re-prioritized after one real-night use.
