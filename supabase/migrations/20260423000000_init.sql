-- WADL initial schema — Day 1
-- Tables: profiles, accounts, venues, events, event_nights, event_staff,
-- allocations, guests, check_ins, audit_log.
-- RLS: enabled on every table. Policies defined for profiles/accounts/venues
-- (Day 1 onboarding surface). Other tables default-deny until Day 2+ adds
-- policies as features land.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
do $$ begin
  create type user_role as enum ('owner', 'manager', 'staff', 'guest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('venue', 'brand', 'individual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('venue_owned', 'brand_takeover', 'co_produced', 'brand_pop_up');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tier as enum ('ga', 'vip', 'all_access');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rsvp_status as enum ('pending', 'approved', 'rejected', 'waitlisted', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type check_in_state as enum ('approved', 'not_found', 'already_used', 'wrong_night', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Tables
-- ============================================================================

-- profiles: extends auth.users with WADL fields.
-- account_id FK added after accounts table exists.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text,
  full_name text,
  role user_role not null default 'guest',
  account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_type account_type not null,
  display_name text not null,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add the deferred FK now that accounts exists.
do $$ begin
  alter table public.profiles
    add constraint profiles_account_id_fkey
    foreign key (account_id) references public.accounts(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists profiles_account_id_idx on public.profiles(account_id);
create index if not exists accounts_owner_user_id_idx on public.accounts(owner_user_id);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  address text,
  city text,
  timezone text not null default 'America/New_York',
  default_capacity int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venues_account_id_idx on public.venues(account_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  event_type event_type not null default 'venue_owned',
  name text not null,
  description text,
  flyer_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_account_id_idx on public.events(account_id);
create index if not exists events_venue_id_idx on public.events(venue_id);

create table if not exists public.event_nights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  night_date date not null,
  doors_at timestamptz not null,
  cutoff_at timestamptz,
  capacity_cap int,
  lockdown_threshold_pct int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists event_nights_event_id_idx on public.event_nights(event_id);

create table if not exists public.event_staff (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role user_role not null check (role in ('manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_staff_user_id_idx on public.event_staff(user_id);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  event_night_id uuid not null references public.event_nights(id) on delete cascade,
  holder_name text not null,
  holder_phone text,
  holder_email text,
  magic_link_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  cap int not null,
  auto_approve boolean not null default false,
  list_open boolean not null default true,
  plus_ones_allowed boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists allocations_event_night_id_idx on public.allocations(event_night_id);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_night_id uuid not null references public.event_nights(id) on delete cascade,
  allocation_id uuid references public.allocations(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  plus_ones int not null default 0,
  tier tier not null default 'ga',
  status rsvp_status not null default 'pending',
  qr_token text unique,
  added_by_user_id uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guests_event_night_id_idx on public.guests(event_night_id);
create index if not exists guests_allocation_id_idx on public.guests(allocation_id);
create index if not exists guests_phone_idx on public.guests(phone);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  event_night_id uuid not null references public.event_nights(id),
  scanned_by uuid references public.profiles(id),
  state check_in_state not null,
  scanned_at timestamptz not null default now()
);
create index if not exists check_ins_guest_id_idx on public.check_ins(guest_id);
create index if not exists check_ins_event_night_id_idx on public.check_ins(event_night_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_allocation_id uuid references public.allocations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  context jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_user_id_idx on public.audit_log(actor_user_id);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger accounts_set_updated_at before update on public.accounts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger venues_set_updated_at before update on public.venues
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger events_set_updated_at before update on public.events
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- handle_new_user: auto-insert profiles row when auth.users row is created.
-- SECURITY DEFINER bypasses RLS for this single trusted insert.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS — enable everywhere; Day 1 policies below.
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.accounts       enable row level security;
alter table public.venues         enable row level security;
alter table public.events         enable row level security;
alter table public.event_nights   enable row level security;
alter table public.event_staff    enable row level security;
alter table public.allocations    enable row level security;
alter table public.guests         enable row level security;
alter table public.check_ins      enable row level security;
alter table public.audit_log      enable row level security;

-- profiles: user reads/updates own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- accounts: user can insert their own account and read/update accounts they own.
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts
  for select using (owner_user_id = auth.uid());

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own" on public.accounts
  for insert with check (owner_user_id = auth.uid());

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- venues: scoped through account ownership.
drop policy if exists "venues_select_via_account" on public.venues;
create policy "venues_select_via_account" on public.venues
  for select using (
    exists (select 1 from public.accounts a where a.id = venues.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "venues_insert_via_account" on public.venues;
create policy "venues_insert_via_account" on public.venues
  for insert with check (
    exists (select 1 from public.accounts a where a.id = venues.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "venues_update_via_account" on public.venues;
create policy "venues_update_via_account" on public.venues
  for update using (
    exists (select 1 from public.accounts a where a.id = venues.account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.accounts a where a.id = venues.account_id and a.owner_user_id = auth.uid())
  );

-- events, event_nights, event_staff, allocations, guests, check_ins, audit_log:
-- RLS enabled but no policies — default deny. Policies will be added on the
-- days those tables are actually used (Day 2+). Server code can still read
-- via the service-role key when required.
