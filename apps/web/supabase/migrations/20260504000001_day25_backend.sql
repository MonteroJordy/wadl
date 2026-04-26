-- Day 25: Backend hardening — Twilio delivery status, Stripe Connect, recurring-event cron audit.

-- ============================================================================
-- sms_log delivery status (Day 23 only recorded the queued/sent status from
-- the initial Twilio API call). Twilio's status callback URL fires later
-- with the real outcome — we capture it here.
-- ============================================================================
alter table public.sms_log
  add column if not exists twilio_status text,
  add column if not exists twilio_error_code text,
  add column if not exists status_updated_at timestamptz;

-- The webhook needs to find rows by Twilio MessageSid. provider_sid already
-- exists from Day 20; just make sure it's indexed.
create index if not exists sms_log_provider_sid_idx
  on public.sms_log(provider_sid)
  where provider_sid is not null;

-- ============================================================================
-- connect_accounts — Stripe Connect onboarding state per account.
-- One row per WADL account that has begun Connect onboarding. The
-- Stripe Connect webhook (account.updated) keeps this in sync.
-- ============================================================================
create table if not exists public.connect_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  default_currency text,
  email text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists connect_accounts_account_idx
  on public.connect_accounts(account_id);

alter table public.connect_accounts enable row level security;

drop policy if exists "connect_accounts_owner_select" on public.connect_accounts;
create policy "connect_accounts_owner_select" on public.connect_accounts
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = connect_accounts.account_id and a.owner_user_id = auth.uid()
    )
  );

-- Service-role writes only (webhook + onboarding).

-- ============================================================================
-- event_template_runs — audit table for the recurring-event cron worker.
-- Every time the cron tries to fire a template, it writes a row here:
-- success or skip with a reason. This is what makes the cron observable.
-- ============================================================================
create table if not exists public.event_template_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.event_templates(id) on delete cascade,
  ran_at timestamptz not null default now(),
  outcome text not null check (outcome in ('created', 'skipped', 'error')),
  reason text,
  created_event_id uuid references public.events(id) on delete set null
);
create index if not exists event_template_runs_tpl_idx
  on public.event_template_runs(template_id, ran_at desc);

alter table public.event_template_runs enable row level security;

drop policy if exists "event_template_runs_owner_select" on public.event_template_runs;
create policy "event_template_runs_owner_select" on public.event_template_runs
  for select using (
    exists (
      select 1 from public.event_templates t
      join public.accounts a on a.id = t.account_id
      where t.id = event_template_runs.template_id
        and a.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- accounts.stripe_connect_account_id — denormalized pointer for fast lookup.
-- The connect_accounts row is canonical, but the events that need to know
-- "is this account Connect-onboarded?" only need the Stripe account ID.
-- ============================================================================
alter table public.accounts
  add column if not exists stripe_connect_account_id text;
