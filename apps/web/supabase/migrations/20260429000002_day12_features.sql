-- Day 12: production hardening + venue onboarding.

-- ============================================================================
-- profiles: track onboarding tutorial completion
-- ============================================================================
alter table public.profiles
  add column if not exists tour_completed_at timestamptz,
  add column if not exists tour_dismissed_at timestamptz,
  add column if not exists demo_seeded_at timestamptz;

-- Profiles already has self-update RLS via Day 1; tour fields are user-owned.

-- ============================================================================
-- broadcasts: log of bulk SMS sends (idempotency + audit + cost tracking)
-- ============================================================================
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  sent_by uuid references public.profiles(id),
  body text not null,
  filters jsonb,
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists broadcasts_event_id_idx on public.broadcasts(event_id);
create index if not exists broadcasts_account_id_idx on public.broadcasts(account_id);

alter table public.broadcasts enable row level security;

drop policy if exists "broadcasts_select_via_owner" on public.broadcasts;
create policy "broadcasts_select_via_owner" on public.broadcasts
  for select using (
    exists (select 1 from public.accounts a
            where a.id = broadcasts.account_id and a.owner_user_id = auth.uid())
  );
