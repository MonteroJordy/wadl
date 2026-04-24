# WADL — Project Brief

## 1. What WADL is
A guest-list management platform for nightlife venues, brands, artists, and promoters. Replaces the WhatsApp + spreadsheet chaos at every venue's door. Originally called NightOps, now WADL. Founder Jordy Montero runs marketing for major DJs/brands/venues in Miami and works the door.

## 2. The problem
At a venue's door on a busy night there are multiple parallel guest lists (venue, brand, each artist, each promoter, owner, friends/family), each with tiers (GA, VIP, All Access). Links get shared virally. Mid-event WhatsApp adds arrive with no tier labels. No approval flow, no accountability. WADL fixes every part of this loop.

## 3. Roles
- Owner (coral #FF4A2B): creates events, invites co-owners, assigns allocations, approves RSVPs, sets caps, views analytics, manages billing.
- Door Manager (gold #F5C842): full guest list at door, manual add, QR scan, approve pending. No allocation/settings control.
- Door Staff (mint #00D97E): scan QR, search by name, see check-in result. Nothing else.
- Guest (lavender #A78BFA): discovery, RSVP, phone verify, QR ticket, cancel, refer-a-friend.
- Account types at signup: Venue, Brand, or Individual. Promoters/artists do NOT need an account — they get magic links.

## 4. Core primitive: Allocations
Allocation = {event_night, holder, cap, auto_approve, list_open, plus_ones_allowed}. Holder gets a magic link (no account) and adds guests up to cap. Goes to approval queue unless auto_approve is on. Every add is attributed (powers scorecards and audit logs).

## 5. Event model
- Type: venue-owned / brand takeover / co-produced / brand pop-up.
- Co-owners: other accounts invited with permission levels via SMS+email accept link.
- Multi-night: one event, multiple nights, one QR per night per guest.
- Time cutoffs, capacity cap per night, Capacity Lockdown at % threshold.
- Flyer: 4:5 image as hero on invite/discovery.

## 6. Killer feature: Chat Hub
Replaces WhatsApp. Staff paste plain-text name dumps. Claude API parses names, extracts tier labels, defaults to GA, handles shorthand like "+2 w/ Diplo VIP". Owner confirms in chathubparsed before commit. Every submission attributed, logged, reversible.

## 7. MVP scope (7-day cut)
Must have: auth (signup/login/OTP/reset/routing), owner onboarding (entitysetup → venuesetup → first event), create event (multi-night), allocations (add holder, magic link, cap, auto-approve, holder page), guest RSVP (invite → detail → form → phone OTP → QR via SMS), QR scanner (approved + 4 fail states), name search at door, owner guest list (filter/approve/detail/add), approval queue, owner dashboard (daydash), basic analytics (checked-in + show rate + tier), audit log.
Nice-to-have: Chat Hub AI, waitlist auto-promote, co-owner invite, promoter scorecards, clone event.
v1.1 (DO NOT BUILD YET): cross-event analytics, multi-venue switcher, guest notes/tags, tier upgrade notifications, internal CMS, guest merge, flag list, SMS templates, billing portal, export CSV/PDF.

## 8. Tech stack (locked)
Next.js 14 App Router + React + Tailwind (web). Expo/React Native (mobile, later). Supabase (Postgres + Auth + Edge Functions + Realtime). Twilio (SMS). Stripe (subscription billing). Claude API (Chat Hub). Vercel (hosting). Principles: provider field on every external-service table so Twilio/Stripe are swappable; REST API under app/api/; webhooks under app/api/webhooks/<provider>/; magic links never require a WADL account.

## 9. Supabase auth
Phone OTP primary, email+password fallback. profiles.role ∈ (owner|manager|staff|guest). Staff/door managers scoped per-event via event_staff(event_id, user_id, role). RLS on from day 1. Test phone 3057990518 with OTP 123456 in Auth → Providers → Phone → Test Phone Numbers.

## 10. Design system
Colors: --bg #0a0a0a, --s1 #111, --s2 #181818, --s3 #222, --coral #FF4A2B, --gold #F5C842, --mint #00D97E, --lav #A78BFA, --cream #F2EDE4, --muted rgba(242,237,228,0.50), --line rgba(255,255,255,0.07).
Fonts: Bebas Neue (display/headings/stats), Epilogue (body/buttons), DM Mono (tiny uppercase labels/timestamps).
Aesthetic: very dark, high contrast, coral-only accents, gradients only on avatars. Mobile-first for owner/staff/guest (375×740 frames); desktop for admin portal/analytics/CMS. A detailed design reference HTML (96 screens) will be provided after Day 1.

## 11. Naming
Product: WADL (uppercase). Repo: wadl. DB tables: snake_case plural. TS types: PascalCase singular. Routes: kebab-case (/owner/dashboard, /door/scan, /guest/rsvp/[eventId]).

## 12. Seven-day build order
Day 1: scaffold Next.js in current folder, connect Supabase, migrate schema (profiles, accounts, venues, events, event_nights, event_staff, allocations, guests, check_ins, audit_log), enable phone+email auth, build login/OTP/signup/entitysetup/venuesetup end-to-end.
Day 2: owner weekview + daydash, create event (multi-night), event settings, seed test event.
Day 3: allocations list+detail, promoter onboarding + magic-link, public holder page at /h/[token], unified approval queue.
Day 4: discovery, event detail, RSVP form, phone verify, QR via Twilio SMS, My Tickets (light auth via phone).
Day 5: door staff home + scanner, name search + manual check-in, scan states, door manager view, mid-event manual add.
Day 6: post-event recap, basic analytics, audit log viewer, export CSV, fix empty states.
Day 7: deploy to Vercel, full dry-run event with real phone/SMS/QR/scan, fix, document.

## 13. Do NOT
- Build v1.1 list features. Stub them.
- Implement Chat Hub AI before Day 7 unless MVP is green by Day 6.
- Over-engineer auth (phone OTP + role check + RLS only).
- Invent features beyond the prototype.
- Change colors/fonts/mobile framing.
- Commit secrets. .env.local locally, Vercel env for prod.

## 14. First action
After saving and re-reading this file, reply with:
(a) A 5-bullet summary of WADL and the MVP scope so I can confirm alignment.
(b) A numbered checklist of exactly what you need from me to start Day 1 (Supabase URL, anon key, service_role key, anything else), with a note telling me WHERE to paste each secret (e.g. .env.local path) so I hand them over safely.
Then stop and wait for my confirmation before touching code.
