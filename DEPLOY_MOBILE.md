# WADL Mobile — Deploy Guide

The Expo iOS app at `apps/mobile/` ships through **EAS Build** + **TestFlight** + the **App Store**. This guide is the full pipeline from "scaffold compiles" to "app reviewed and live".

> **Never paste real secrets into this file.** Treat every value below as a placeholder.

---

## 0. What ships

The mobile app focuses on the on-the-night flows: **Discover**, **MyTickets**, **RSVP**, **Ticket QR**, **Door Scanner**, **Owner glance**, **Profile**. Power-user flows (Chat Hub, allocations CRUD, scorecards, broadcasts, billing, webhooks, embed widget, analytics, audit, internal CMS) intentionally stay on the web at `wadl-pearl.vercel.app`. The mobile dashboard surfaces a footer link reminding users where those live.

Backend is shared: same Supabase project, same RLS, same `notifications` + `user_devices` + `guests` + everything else. No separate mobile API.

---

## 1. Prerequisites (one-time)

### 1.1 Apple Developer Program enrollment

**Required for TestFlight + App Store.** $99/yr.

1. Sign up: https://developer.apple.com/programs/enroll/
2. Wait 24–48h for verification (especially for organizations).
3. Once approved, note your **Team ID** (Apple Developer → Membership).

### 1.2 App Store Connect record

Create the app's record before the first build:
1. Log into https://appstoreconnect.apple.com.
2. **My Apps → +** → **New App**.
3. Bundle ID: `com.wadl.app` (matches `apps/mobile/app.json`).
4. SKU: `wadl-app-001` (anything unique within your account).
5. Primary language: English (U.S.).
6. Note the **App Store Connect App ID** (numeric, in the URL after creating). Drop it into `apps/mobile/eas.json` → `submit.preview.ios.ascAppId` and `submit.production.ios.ascAppId`.

### 1.3 Expo account + EAS

1. Sign up: https://expo.dev/signup (free tier supports this scale).
2. Install the CLI globally:
   ```bash
   npm install -g eas-cli
   ```
3. Log in:
   ```bash
   eas login
   ```
4. From `apps/mobile/`, link the project:
   ```bash
   cd apps/mobile
   eas init                # creates an EAS project, fills in extra.eas.projectId in app.json
   ```
   Replace the `REPLACE_WITH_EAS_PROJECT_ID` placeholder if `eas init` doesn't auto-edit `app.json` for you.

### 1.4 Local install

From the monorepo root:
```bash
npm install
```
This installs both `apps/web` and `apps/mobile` deps via npm workspaces.

### 1.5 Mobile env

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
# (same values as apps/web/.env.local)
```

### 1.6 Icon + splash assets

`app.json` references `assets/icon.png` (1024×1024) and `assets/splash.png` (2048×2048, coral W on `#0a0a0a`). Generate these from `apps/web/public/icon.svg` and drop them in `apps/mobile/assets/`.

---

## 2. Verify locally (iOS Simulator)

```bash
cd apps/mobile
npm run ios               # opens Simulator, builds JS bundle, hot-reloads
```

Flow to test end-to-end:
1. **Login** with a phone you own. Receive OTP via SMS (or check Supabase logs in dev mode).
2. **OTP** verification → lands on Discover tab.
3. **Discover** lists upcoming nights pulled from Supabase.
4. **Tap an event** → Event detail.
5. **Tap RSVP** → consent toggle, name + +1s, submit.
6. **MyTickets** tab shows the new pending ticket.
7. **Tap ticket** → QR display (placeholder grid; swap in `react-native-qrcode-svg` for prod).
8. **Dashboard** tab (owner accounts only) shows next 14 days. Tap **Open scanner** → camera permission prompt → scanner.
9. **Profile** → Sign out.

---

## 3. EAS Build profiles

Defined in `apps/mobile/eas.json`:

| Profile | Distribution | Target | When |
|---|---|---|---|
| `development` | internal | iOS Simulator + Android emulator | Local dev with the dev client |
| `preview` | internal (TestFlight) | Real iOS device | Beta testers via TestFlight |
| `production` | store | iOS App Store | Public release |

Build commands:

```bash
cd apps/mobile

# Simulator build (no Apple credentials needed)
eas build --profile development --platform ios

# TestFlight build (needs Apple Developer + EAS-generated certs)
eas build --profile preview --platform ios

# App Store build (same creds, different distribution)
eas build --profile production --platform ios
```

First time you run a non-Simulator build, EAS will prompt you to either upload your existing certs/profiles or let it manage them for you. **Let EAS manage them** unless you have a strong reason — it handles renewal automatically.

---

## 4. TestFlight (preview)

```bash
cd apps/mobile

# 1. Build the .ipa (takes ~15 min; you'll get email + dashboard link).
eas build --profile preview --platform ios

# 2. Submit the build to App Store Connect.
eas submit --profile preview --platform ios
```

After ~5 min App Store Connect processes the build. Then:
1. Go to App Store Connect → your app → **TestFlight** tab.
2. Add **Internal Testers** (up to 100 of your team — instant).
3. For external testers (up to 10k), add an **External Group** + submit for **Beta App Review** (24–48h Apple review).

Each new build needs:
- A bumped `buildNumber` in `app.json` (or use `eas.json` `autoIncrement: true` on the production profile).
- A what-to-test note in App Store Connect.

---

## 5. App Store submission

Once TestFlight has been usable for a release candidate:

### Pre-submit checklist

- [ ] Privacy Policy URL: https://wadl-pearl.vercel.app/privacy
- [ ] Terms of Service URL: https://wadl-pearl.vercel.app/terms
- [ ] Support URL: https://wadl-pearl.vercel.app (or `mailto:jmontero@mainframeagency.com`)
- [ ] Marketing URL: https://wadl-pearl.vercel.app
- [ ] App Store screenshots: 6.7" iPhone (1290×2796) — at least 3, max 10. Generate from the Simulator's "File → Save Screen" while running each key screen.
- [ ] App Store description, keywords, and what's-new copy
- [ ] Demo account credentials — create a test account in Supabase (a verified phone you control + a venue with a sample event) and provide the credentials in App Review notes
- [ ] Encryption export compliance — `app.json` already sets `ITSAppUsesNonExemptEncryption: false` because we only use HTTPS + Supabase's standard auth (no custom crypto)
- [ ] Age rating questionnaire (likely 17+ if event listings can include nightclubs / alcohol)
- [ ] Privacy Nutrition Labels — at minimum: Phone Number, Name, Photos (if photographer flow used), Identifiers (Device ID via Supabase user.id). Mark all as "Linked to user", "Not used for tracking".

### Submit

```bash
cd apps/mobile

# 1. Build production .ipa.
eas build --profile production --platform ios

# 2. Submit to App Store Connect for review.
eas submit --profile production --platform ios
```

Apple review window: 24–72h typical. Reject reasons we anticipate:
- **No demo account** → make sure App Review notes include phone + OTP bypass instructions (set Supabase Auth → Settings → SMS provider to "Twilio with verify-only" so reviewers can use a static OTP).
- **Camera permission unjustified** → `NSCameraUsageDescription` already says "scan guest QR codes at the door" — that's clear.
- **Account creation gated behind external action** → users sign up in-app via phone OTP; we don't require a website signup first. Should be fine.
- **Login required to use the app** → submit reviewers need a working demo phone; flag in notes.

---

## 6. OTA updates (post-launch)

Most JS-only changes don't need a new App Store submission — push them via EAS Update:

```bash
cd apps/mobile
eas update --branch production --message "fix copy on discover screen"
```

Native changes (new dependency that touches iOS code, app icon swap, bundle id change) require a new build + submission.

---

## 7. Push notifications

Already wired:
- Mobile registers an **Expo push token** on first authed open via `apps/mobile/src/lib/push.ts` → `registerForPushNotifications()`.
- Token saved to `public.user_devices` (per-user, per-device, indexed unique).
- Server-side, `apps/web/lib/notify()` calls `sendExpoPushToAccount()` alongside the existing web push fan-out, so a single `notify()` call lights up every web AND mobile subscriber on the account.
- `DeviceNotRegistered` tickets returned by Expo Push API auto-prune stale tokens.

No extra Apple infrastructure needed — Expo Push proxies to APNs using their own developer cert. If you ever outgrow Expo Push, swap `lib/expo-push.ts` for direct APNs HTTP/2 calls (would need an APNs auth key from Apple Developer).

---

## 8. Cost summary

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | $99/yr | Required for TestFlight + App Store |
| Expo / EAS Free tier | $0 | 30 builds/mo, sufficient at our scale |
| Expo Push | $0 | Unlimited; rate-limited but generous |
| EAS Production tier | $99/mo (optional) | Faster builds + priority queue if monthly free runs out |

---

## 9. Smoke test on TestFlight

Once a tester has the build installed:
1. Open WADL → Login with their real phone → receive OTP.
2. Allow Notifications when prompted.
3. Discover lists tonight's events.
4. RSVP to one → MyTickets shows it.
5. Switch to Dashboard tab → tap Open Scanner → grant camera → scan a printed QR from web `/t/[token]` → APPROVED flash.
6. Sign out → confirm tokens clear from SecureStore + user_devices row removed (verify in Supabase).

Done.
