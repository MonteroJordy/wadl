-- Day 50: guest identities — tag-and-merge across events.
-- v2 brief, paragraph "Tag-and-merge guest data": "If a guest signs up
-- for a list without an account, save their data and tag it to their
-- phone or email. If they later make an account, all their past
-- history (RSVPs, attended events, tier upgrades) should appear."
--
-- Pattern: one identity per phone (and per non-null email). guests rows
-- FK to identity_id when phone matches. Backfill creates identities
-- from existing distinct phones; existing guests get linked.
--
-- Forward-looking: when a user creates an auth account with a matching
-- phone, application code copies all guest history under the new
-- profile by joining on identity_id.

create table if not exists public.guest_identities (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  email text,
  full_name text,
  first_name text,
  last_name text,
  -- linked profile: set when this identity claims an auth account.
  -- Nullable — the whole point of identities is to track non-authed guests.
  profile_id uuid references public.profiles(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists guest_identities_phone_idx
  on public.guest_identities(phone);

create unique index if not exists guest_identities_email_idx
  on public.guest_identities(lower(email))
  where email is not null;

create index if not exists guest_identities_profile_id_idx
  on public.guest_identities(profile_id)
  where profile_id is not null;

-- Add identity_id to guests. Nullable — guests pre-migration may not
-- have a phone, and walk-up entries from door staff can also be
-- identity-less.
alter table public.guests
  add column if not exists identity_id uuid references public.guest_identities(id) on delete set null;

create index if not exists guests_identity_id_idx
  on public.guests(identity_id)
  where identity_id is not null;

-- Backfill: build identities from distinct existing phones, then link
-- guests to their identity. Use the most recent name as the canonical
-- one (operators can edit later).
insert into public.guest_identities (phone, email, full_name, first_seen_at, last_seen_at)
  select
    g.phone,
    -- If multiple guests share a phone with different emails, pick the
    -- most recent non-null email.
    (select g2.email from public.guests g2
       where g2.phone = g.phone and g2.email is not null
       order by g2.created_at desc limit 1) as email,
    -- Most recent name wins.
    (select g2.full_name from public.guests g2
       where g2.phone = g.phone
       order by g2.created_at desc limit 1) as full_name,
    min(g.created_at) as first_seen_at,
    max(g.created_at) as last_seen_at
  from public.guests g
  where g.phone is not null
  group by g.phone
  on conflict (phone) do nothing;

update public.guests
  set identity_id = gi.id
  from public.guest_identities gi
  where guests.phone = gi.phone
    and guests.identity_id is null;

-- A read-only view: every event a given identity has touched.
create or replace view public.guest_history as
  select
    gi.id as identity_id,
    gi.phone,
    gi.email,
    gi.full_name,
    g.id as guest_id,
    g.event_night_id,
    g.tier,
    g.status,
    g.plus_ones,
    g.created_at,
    en.night_date,
    en.doors_at,
    e.id as event_id,
    e.name as event_name
  from public.guest_identities gi
  join public.guests g on g.identity_id = gi.id
  join public.event_nights en on en.id = g.event_night_id
  join public.events e on e.id = en.event_id;

-- RLS — guests can read their own identity row by phone (matched to
-- their auth.jwt() phone claim), operators read identities for guests
-- attached to events they own.
alter table public.guest_identities enable row level security;

drop policy if exists "identities_select_self" on public.guest_identities;
create policy "identities_select_self" on public.guest_identities
  for select using (
    auth.jwt() ->> 'phone' = phone
    or profile_id = auth.uid()
  );

drop policy if exists "identities_select_via_event_owner" on public.guest_identities;
create policy "identities_select_via_event_owner" on public.guest_identities
  for select using (
    exists (
      select 1 from public.guests g
      join public.event_nights en on en.id = g.event_night_id
      join public.events e on e.id = en.event_id
      join public.accounts a on a.id = e.account_id
      where g.identity_id = guest_identities.id
        and a.owner_user_id = auth.uid()
    )
  );

-- Mutations happen server-side via service role from the RSVP action.

-- Helper: upsert an identity by phone, returning the id. Used by the
-- RSVP server action on every sign-up — recognizes prior invitees, or
-- creates a new identity for first-time guests.
create or replace function public.upsert_guest_identity(
  p_phone text,
  p_email text,
  p_full_name text,
  p_first_name text,
  p_last_name text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.guest_identities (phone, email, full_name, first_name, last_name)
    values (p_phone, p_email, p_full_name, p_first_name, p_last_name)
    on conflict (phone) do update
      set
        email = coalesce(excluded.email, guest_identities.email),
        full_name = coalesce(excluded.full_name, guest_identities.full_name),
        first_name = coalesce(excluded.first_name, guest_identities.first_name),
        last_name = coalesce(excluded.last_name, guest_identities.last_name),
        last_seen_at = now()
    returning id into v_id;
  return v_id;
end$$;

comment on table public.guest_identities is
  'One row per phone (or email). Tag-and-merge guest history across events without forcing an auth account.';
