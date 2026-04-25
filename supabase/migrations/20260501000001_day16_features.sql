-- Day 16: web polish + Day 18 prep.

-- ============================================================================
-- profiles: onboarding wizard completion
-- ============================================================================
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- ============================================================================
-- user_devices: Expo push tokens per user / device.
-- Same table will hold web push subs eventually if we want one inbox; today
-- web push lives in push_subscriptions and Expo lives here.
-- ============================================================================
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  expo_push_token text,
  device_name text,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
create index if not exists user_devices_user_idx on public.user_devices(user_id);

alter table public.user_devices enable row level security;
drop policy if exists "user_devices_self_select" on public.user_devices;
create policy "user_devices_self_select" on public.user_devices
  for select using (user_id = auth.uid());
drop policy if exists "user_devices_self_mutate" on public.user_devices;
create policy "user_devices_self_mutate" on public.user_devices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
