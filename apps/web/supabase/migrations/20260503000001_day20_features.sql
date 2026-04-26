-- Day 20: owner platform parity additions.

-- ============================================================================
-- profiles.notif_prefs — per-user channel + timing preferences for notifications
-- ============================================================================
alter table public.profiles
  add column if not exists notif_prefs jsonb not null default '{
    "channels": { "push": true, "email": true, "sms": false },
    "kinds": {
      "rsvp_pending": true,
      "capacity_alert": true,
      "staff_assigned": true,
      "billing_event": true,
      "co_owner_accepted": true,
      "scan_failure_high": true,
      "waitlist_promoted": true,
      "referral_arrived": true,
      "guest_flagged": true,
      "tier_upgraded": false,
      "broadcast_sent": false
    },
    "quiet_hours": { "enabled": false, "start": "02:00", "end": "10:00" }
  }'::jsonb;

-- ============================================================================
-- guest_messages — per-guest direct messages from owner (not blast).
-- Used by the Chat Hub guest-DM feature on Day 23.
-- ============================================================================
create table if not exists public.guest_messages (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  sent_by uuid references public.profiles(id) on delete set null,
  body text not null,
  channel text not null check (channel in ('sms', 'email')),
  delivery_status text,
  delivery_error text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists guest_messages_guest_idx on public.guest_messages(guest_id, created_at desc);
create index if not exists guest_messages_account_idx on public.guest_messages(account_id, created_at desc);

alter table public.guest_messages enable row level security;
drop policy if exists "guest_messages_owner_select" on public.guest_messages;
create policy "guest_messages_owner_select" on public.guest_messages
  for select using (
    exists (select 1 from public.accounts a
            where a.id = guest_messages.account_id and a.owner_user_id = auth.uid())
  );

-- ============================================================================
-- sms_log — every outbound SMS recorded for the owner's audit + delivery view.
-- Backfills via lib/sms wrapper on next send; no historical data populated.
-- ============================================================================
create table if not exists public.sms_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  guest_id uuid references public.guests(id) on delete set null,
  to_phone text not null,
  body text not null,
  template_key text,
  provider text not null,
  provider_sid text,
  status text not null default 'sent',
  error text,
  segments int,
  cost_estimate_usd numeric(10,4),
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists sms_log_account_idx on public.sms_log(account_id, created_at desc);
create index if not exists sms_log_event_idx on public.sms_log(event_id, created_at desc);
create index if not exists sms_log_phone_idx on public.sms_log(to_phone);

alter table public.sms_log enable row level security;
drop policy if exists "sms_log_owner_select" on public.sms_log;
create policy "sms_log_owner_select" on public.sms_log
  for select using (
    account_id is not null and exists (
      select 1 from public.accounts a
      where a.id = sms_log.account_id and a.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- support_tickets — for the CMS Support Queue (Day 22).
-- ============================================================================
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  reporter_user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_status_idx on public.support_tickets(status, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_self_select" on public.support_tickets;
create policy "support_tickets_self_select" on public.support_tickets
  for select using (reporter_user_id = auth.uid());

drop policy if exists "support_tickets_self_insert" on public.support_tickets;
create policy "support_tickets_self_insert" on public.support_tickets
  for insert with check (reporter_user_id = auth.uid());

-- ============================================================================
-- feature_flags — platform-wide flag registry, surfaced in CMS (Day 22).
-- ============================================================================
create table if not exists public.feature_flags (
  key text primary key,
  description text,
  enabled boolean not null default false,
  rollout_pct int not null default 0,
  rollout_target text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
-- Service-role writes only; no end-user policies. Read via admin client.

-- Seed a few starter flags so the CMS view isn't empty.
insert into public.feature_flags (key, description, enabled, rollout_pct, rollout_target)
values
  ('chat_hub_ai',           'Use Claude API for Chat Hub parsing.', true,  100, 'all'),
  ('offline_scanner',       'Cache event manifest + queue scans offline.', true, 100, 'all'),
  ('embed_widget',          'Embed iframe RSVP widget for venue sites.', true,  100, 'all'),
  ('mobile_push',           'Native iOS push via Expo.', false, 0, 'beta'),
  ('stripe_connect_payouts','Promoter payout flow via Stripe Connect.', false, 0, 'dev'),
  ('co_owner_edit_writes',  'Future write-tier enforcement for co-owners.', false, 0, 'dev')
on conflict (key) do nothing;
