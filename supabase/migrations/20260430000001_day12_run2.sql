-- Day 12 (run 2): web push subscriptions + error log + SMS opt-out tracking.

-- ============================================================================
-- guests.sms_opted_out — TCPA opt-out tracking (Day 13 §17 needs it; lands here
-- with the rest of compliance plumbing).
-- ============================================================================
alter table public.guests
  add column if not exists sms_opted_out boolean not null default false,
  add column if not exists sms_opted_out_at timestamptz;

create index if not exists guests_sms_opted_out_idx on public.guests(phone)
  where sms_opted_out;

-- ============================================================================
-- push_subscriptions — Web Push API endpoints per profile.
-- ============================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_self_select" on public.push_subscriptions;
create policy "push_subs_self_select" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subs_self_insert" on public.push_subscriptions;
create policy "push_subs_self_insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push_subs_self_delete" on public.push_subscriptions;
create policy "push_subs_self_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ============================================================================
-- error_log — server-side errors captured for the platform owner.
-- ============================================================================
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  route text,
  user_id uuid references public.profiles(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  severity text not null default 'error',
  message text not null,
  stack text,
  context jsonb
);
create index if not exists error_log_recent_idx on public.error_log(occurred_at desc);
create index if not exists error_log_severity_idx on public.error_log(severity, occurred_at desc);

-- Service-role only writes; SELECT is gated app-side by platform-owner email check.
alter table public.error_log enable row level security;

-- ============================================================================
-- cookie_consent + tcpa metadata also live on profiles for signed-in users.
-- ============================================================================
alter table public.profiles
  add column if not exists cookie_consent text,
  add column if not exists cookie_consent_at timestamptz;
