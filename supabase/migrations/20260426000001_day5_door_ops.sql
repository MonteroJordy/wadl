-- Day 5: door operations.
-- Adds door_staff + door_manager role values, do_not_admit scan state,
-- flag_dna/flag_reason on guests, staff_invites table + RLS.
--
-- Note: ALTER TYPE ... ADD VALUE must commit before the new value is used
-- inside subsequent statements. psql runs each statement in autocommit mode
-- unless wrapped in BEGIN/COMMIT, so the ADD VALUE statements below commit
-- individually before anything references them.

alter type user_role         add value if not exists 'door_staff';
alter type user_role         add value if not exists 'door_manager';
alter type check_in_state    add value if not exists 'do_not_admit';

-- event_staff.role is gated by a CHECK constraint from Day 1 ('manager','staff').
-- Replace it with one that accepts the new door_* values. (Legacy values kept
-- in the enum but blocked from this table.)
alter table public.event_staff
  drop constraint if exists event_staff_role_check;
alter table public.event_staff
  add constraint event_staff_role_check
    check (role in ('door_staff', 'door_manager'));

-- guests: DNA / do-not-admit flag + reason (flag-setting UI is Day 6).
alter table public.guests
  add column if not exists flag_dna boolean not null default false;
alter table public.guests
  add column if not exists flag_reason text;

create index if not exists guests_flag_dna_idx
  on public.guests(event_night_id)
  where flag_dna = true;

-- staff_invites: one-time invite links sent via SMS to a staff phone.
-- Token is stored hex; link is /staff-invite/<token>.
create table if not exists public.staff_invites (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  phone        text not null,
  role         user_role not null check (role in ('door_staff', 'door_manager')),
  token        text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid not null references public.profiles(id) on delete set null,
  used_at      timestamptz,
  used_by      uuid references public.profiles(id),
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists staff_invites_event_id_idx on public.staff_invites(event_id);
create index if not exists staff_invites_token_idx    on public.staff_invites(token)
  where used_at is null;

alter table public.staff_invites enable row level security;

-- Owners can read/create/delete invites for their own events. Accept happens
-- server-side via service role (the invitee is not yet an event_staff member,
-- so they can't satisfy any event-scoped policy until after accept).
drop policy if exists "staff_invites_select_via_owner" on public.staff_invites;
create policy "staff_invites_select_via_owner" on public.staff_invites
  for select using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = staff_invites.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "staff_invites_insert_via_owner" on public.staff_invites;
create policy "staff_invites_insert_via_owner" on public.staff_invites
  for insert with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = staff_invites.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "staff_invites_delete_via_owner" on public.staff_invites;
create policy "staff_invites_delete_via_owner" on public.staff_invites
  for delete using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = staff_invites.event_id and a.owner_user_id = auth.uid())
  );
