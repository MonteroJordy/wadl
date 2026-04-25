# WADL Mobile (Expo / iOS)

Native iOS app sharing the same Supabase backend as `apps/web`.

## First-time setup

```bash
cd apps/mobile
cp .env.example .env       # fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install                # or pnpm install from the monorepo root
```

`assets/icon.png` and `assets/splash.png` are referenced by `app.json` but
not yet committed — generate from `apps/web/public/icon.svg` (1024×1024 for
icon, 2048×2048 for splash with the same coral W on a `#0a0a0a` background)
and drop them in `apps/mobile/assets/`.

## Run on iOS Simulator

```bash
npm run ios
# or from monorepo root:  npm run ios
```

You'll need Xcode 15+ and an iOS Simulator already provisioned.

## TestFlight + App Store

See `DEPLOY_MOBILE.md` at the repo root for the full pipeline:
1. Apple Developer Program enrollment ($99/yr, required)
2. `eas build --profile preview --platform ios`
3. `eas submit --profile preview`
4. App Store review checklist

## Folder map

```
app/
  _layout.tsx              # auth-gate router (Stack)
  (auth)/                  # login + OTP
  (tabs)/                  # tab bar — Discover / MyTickets / Dashboard / Profile
  (guest)/event/[id]       # public event detail + RSVP + ticket QR
  (door)/scan              # door scanner (expo-barcode-scanner)
  (owner)/event/[id]       # owner per-event quick view
src/lib/supabase.ts        # SecureStore-backed Supabase client
```

## What's intentionally NOT here

The web app at `wadl-pearl.vercel.app` remains the source of truth for
power-user flows (Chat Hub, allocations CRUD, scorecards, broadcasts,
billing, webhooks, embed widget, analytics, audit log, internal CMS).
The mobile app focuses on the on-the-night flows: discover, RSVP, ticket,
scan, quick owner glance.
