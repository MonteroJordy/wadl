-- Day 9: Chat Hub commit log, co-owner invite + acceptance, RLS so co-owners
-- can read events they have permission on. Waitlist + clone use existing
-- columns, no schema changes.

-- ============================================================================
-- co_owner_invites: token-based invite for another account to join an event.
-- ============================================================================
create table if not exists public.co_owner_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  invitee_email text,
  invitee_phone text,
  permission text not null check (permission in ('read_only', 'edit', 'admin')),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references public.profiles(id),
  used_at timestamptz,
  used_by_account_id uuid references public.accounts(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists co_owner_invites_event_id_idx on public.co_owner_invites(event_id);
create index if not exists co_owner_invites_token_idx on public.co_owner_invites(token)
  where used_at is null;

alter table public.co_owner_invites enable row level security;

drop policy if exists "co_owner_invites_select_via_owner" on public.co_owner_invites;
create policy "co_owner_invites_select_via_owner" on public.co_owner_invites
  for select using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = co_owner_invites.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "co_owner_invites_insert_via_owner" on public.co_owner_invites;
create policy "co_owner_invites_insert_via_owner" on public.co_owner_invites
  for insert with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = co_owner_invites.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "co_owner_invites_delete_via_owner" on public.co_owner_invites;
create policy "co_owner_invites_delete_via_owner" on public.co_owner_invites
  for delete using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = co_owner_invites.event_id and a.owner_user_id = auth.uid())
  );

-- ============================================================================
-- event_co_owners: accepted co-ownership relationships.
-- ============================================================================
create table if not exists public.event_co_owners (
  event_id uuid not null references public.events(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  permission text not null check (permission in ('read_only', 'edit', 'admin')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (event_id, account_id)
);
create index if not exists event_co_owners_account_id_idx on public.event_co_owners(account_id);

alter table public.event_co_owners enable row level security;

drop policy if exists "event_co_owners_select_via_owner_or_self" on public.event_co_owners;
create policy "event_co_owners_select_via_owner_or_self" on public.event_co_owners
  for select using (
    -- Primary owner can see all co-owners on their events
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_co_owners.event_id and a.owner_user_id = auth.uid())
    -- Or the user belongs to the co-owner account
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.account_id = event_co_owners.account_id)
  );

drop policy if exists "event_co_owners_insert_via_owner" on public.event_co_owners;
create policy "event_co_owners_insert_via_owner" on public.event_co_owners
  for insert with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_co_owners.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_co_owners_delete_via_owner" on public.event_co_owners;
create policy "event_co_owners_delete_via_owner" on public.event_co_owners
  for delete using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_co_owners.event_id and a.owner_user_id = auth.uid())
  );

-- ============================================================================
-- Extend SELECT policies on events, event_nights, allocations, guests,
-- check_ins so co-owners can read.
-- ============================================================================
drop policy if exists "events_select_via_co_owner" on public.events;
create policy "events_select_via_co_owner" on public.events
  for select using (
    exists (select 1 from public.event_co_owners eco
            join public.profiles p on p.account_id = eco.account_id
            where eco.event_id = events.id and p.id = auth.uid())
  );

drop policy if exists "event_nights_select_via_co_owner" on public.event_nights;
create policy "event_nights_select_via_co_owner" on public.event_nights
  for select using (
    exists (select 1 from public.event_co_owners eco
            join public.profiles p on p.account_id = eco.account_id
            where eco.event_id = event_nights.event_id and p.id = auth.uid())
  );

drop policy if exists "allocations_select_via_co_owner" on public.allocations;
create policy "allocations_select_via_co_owner" on public.allocations
  for select using (
    exists (
      select 1 from public.event_nights en
      join public.event_co_owners eco on eco.event_id = en.event_id
      join public.profiles p on p.account_id = eco.account_id
      where en.id = allocations.event_night_id and p.id = auth.uid()
    )
  );

drop policy if exists "guests_select_via_co_owner" on public.guests;
create policy "guests_select_via_co_owner" on public.guests
  for select using (
    exists (
      select 1 from public.event_nights en
      join public.event_co_owners eco on eco.event_id = en.event_id
      join public.profiles p on p.account_id = eco.account_id
      where en.id = guests.event_night_id and p.id = auth.uid()
    )
  );

drop policy if exists "check_ins_select_via_co_owner" on public.check_ins;
create policy "check_ins_select_via_co_owner" on public.check_ins
  for select using (
    exists (
      select 1 from public.event_nights en
      join public.event_co_owners eco on eco.event_id = en.event_id
      join public.profiles p on p.account_id = eco.account_id
      where en.id = check_ins.event_night_id and p.id = auth.uid()
    )
  );

-- Edit + admin permissions for UPDATE/INSERT on guests + allocations are
-- enforced server-side via lib/co-owner-access.ts checks. (Adding a USING
-- clause that toggles on `permission` is doable but reads gnarly; the
-- server check is more legible and easier to evolve.)
