-- Day 11: virality + production polish.
-- Notifications, referrals, master flag list, photographer + photos (used in Day 13),
-- merge tracking, webhook tables (Day 13).

-- ============================================================================
-- guests: refer-a-friend graph + soft-delete-on-merge
-- ============================================================================
alter table public.guests
  add column if not exists referred_by_guest_id uuid references public.guests(id) on delete set null,
  add column if not exists merged_into_guest_id uuid references public.guests(id) on delete set null,
  add column if not exists merged_at timestamptz;

create index if not exists guests_referred_by_idx on public.guests(referred_by_guest_id);
create index if not exists guests_merged_into_idx on public.guests(merged_into_guest_id);

-- ============================================================================
-- notifications: per-account inbox
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_account_id_idx on public.notifications(account_id);
create index if not exists notifications_unread_idx on public.notifications(account_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_via_owner" on public.notifications;
create policy "notifications_select_via_owner" on public.notifications
  for select using (
    exists (select 1 from public.accounts a
            where a.id = notifications.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "notifications_update_via_owner" on public.notifications;
create policy "notifications_update_via_owner" on public.notifications
  for update using (
    exists (select 1 from public.accounts a
            where a.id = notifications.account_id and a.owner_user_id = auth.uid())
  );
