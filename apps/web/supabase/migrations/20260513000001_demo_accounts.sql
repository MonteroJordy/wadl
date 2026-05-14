-- ============================================================================
-- Demo accounts for preview-mode one-click sign-in.
--
-- Seeds 4 stable users (deterministic UUIDs so the app's /preview page can
-- reference them by ID without a lookup):
--   * owner   — operates "Demo Venue" with a sample event
--   * holder  — claimed allocation on the demo event (promoter view)
--   * staff   — door staff invite accepted on the demo event
--   * guest   — RSVP'd guest with an approved credential
--
-- This is a *preview-only* seed. The /api/preview/login route is env-gated
-- (NEXT_PUBLIC_PREVIEW_MODE) so it 404s on production. The data here uses
-- a dedicated "DEMO" event so it can't be confused with real events.
--
-- Idempotent — re-running the migration leaves all rows in place.
-- ============================================================================

-- Stable UUIDs we can hardcode in the app env / api route.
-- (Generated once; never change these — clients reference them.)
--   owner   00000000-0000-4000-8000-000000000001
--   holder  00000000-0000-4000-8000-000000000002
--   staff   00000000-0000-4000-8000-000000000003
--   guest   00000000-0000-4000-8000-000000000004

-- --- 1. auth.users rows -----------------------------------------------------
-- We bypass the normal signup flow by writing directly to auth.users. This is
-- fine in a migration because it runs as the postgres role. Email confirmation
-- is pre-set so the magic-link flow can complete without a real inbox.

do $$
declare
  demo_users record;
begin
  for demo_users in
    select * from (values
      ('00000000-0000-4000-8000-000000000001'::uuid, 'demo-owner@wadl.test',  'Demo Owner'),
      ('00000000-0000-4000-8000-000000000002'::uuid, 'demo-holder@wadl.test', 'Demo Promoter'),
      ('00000000-0000-4000-8000-000000000003'::uuid, 'demo-staff@wadl.test',  'Demo Door Staff'),
      ('00000000-0000-4000-8000-000000000004'::uuid, 'demo-guest@wadl.test',  'Demo Guest')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password,
      email_confirmed_at, confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values (
      demo_users.id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      demo_users.email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(),
      now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', demo_users.full_name, 'demo', true),
      now(),
      now()
    )
    on conflict (id) do nothing;
  end loop;
end$$;

-- --- 2. profiles + account for the owner ------------------------------------

insert into public.profiles (id, email, full_name, role, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', 'demo-owner@wadl.test',  'Demo Owner',      'owner', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'demo-holder@wadl.test', 'Demo Promoter',   'guest', now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'demo-staff@wadl.test',  'Demo Door Staff', 'staff', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'demo-guest@wadl.test',  'Demo Guest',      'guest', now(), now())
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      updated_at = now();

-- Owner's account (stable id so we can reference it for the event below).
insert into public.accounts (id, account_type, display_name, owner_user_id, created_at, updated_at)
values (
  '00000000-0000-4000-9000-000000000001'::uuid,
  'venue',
  'Demo Venue',
  '00000000-0000-4000-8000-000000000001',
  now(),
  now()
)
on conflict (id) do update
  set display_name = excluded.display_name,
      updated_at = now();

-- Link the owner profile to its account (FK + handle/city set on Day-42).
update public.profiles
  set account_id = '00000000-0000-4000-9000-000000000001'::uuid
where id = '00000000-0000-4000-8000-000000000001';

-- --- 3. Demo venue + event + night ------------------------------------------

insert into public.venues (id, account_id, name, city, default_capacity, created_at, updated_at)
values (
  '00000000-0000-4000-a000-000000000001'::uuid,
  '00000000-0000-4000-9000-000000000001'::uuid,
  'The Demo Room',
  'Miami',
  200,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.events (id, account_id, name, description, created_at, updated_at)
values (
  '00000000-0000-4000-b000-000000000001'::uuid,
  '00000000-0000-4000-9000-000000000001'::uuid,
  'DEMO · Friday Night Showcase',
  'Sample event for preview-mode walkthrough. Real flow, fake data.',
  now(),
  now()
)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      updated_at = now();

-- Sample night — 1 week out so the daydash treats it as upcoming.
insert into public.event_nights (
  id, event_id, night_date, doors_at, capacity_cap, created_at, updated_at
)
values (
  '00000000-0000-4000-c000-000000000001'::uuid,
  '00000000-0000-4000-b000-000000000001'::uuid,
  (current_date + interval '7 days')::date,
  ((current_date + interval '7 days')::date + time '22:00')::timestamptz,
  200,
  now(),
  now()
)
on conflict (id) do update
  set night_date = (current_date + interval '7 days')::date,
      doors_at = ((current_date + interval '7 days')::date + time '22:00')::timestamptz,
      updated_at = now();

-- --- 4. Allocation for the holder (promoter view has data) ------------------

do $$
begin
  -- Only seed if the allocations table has these columns. Skip silently
  -- otherwise so this migration tolerates schema variations.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'allocations'
      and column_name = 'event_night_id'
  ) then
    insert into public.allocations (
      id, event_night_id, holder_name, holder_phone, holder_email,
      cap, auto_approve, list_open, plus_ones_allowed,
      created_at, updated_at
    )
    values (
      '00000000-0000-4000-d000-000000000001'::uuid,
      '00000000-0000-4000-c000-000000000001'::uuid,
      'Demo Promoter',
      null,
      'demo-holder@wadl.test',
      40,
      true,
      true,
      true,
      now(),
      now()
    )
    on conflict (id) do nothing;

    -- A friendly token so /h/<token> renders for the promoter preview.
    insert into public.allocation_tokens (token, allocation_id, created_at)
    values (
      'demo-holder-token',
      '00000000-0000-4000-d000-000000000001',
      now()
    )
    on conflict (token) do nothing;
  end if;
end$$;

-- --- 5. Door staff seat on the demo event -----------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='event_staff'
  ) then
    insert into public.event_staff (event_id, user_id, role, created_at)
    values (
      '00000000-0000-4000-b000-000000000001',
      '00000000-0000-4000-8000-000000000003',
      'staff',
      now()
    )
    on conflict do nothing;
  end if;
end$$;

-- --- 6. Guest RSVP on the demo event ----------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='guests'
  ) then
    insert into public.guests (
      id, event_night_id, full_name, email, status, plus_ones, created_at, updated_at
    )
    values (
      '00000000-0000-4000-e000-000000000001'::uuid,
      '00000000-0000-4000-c000-000000000001'::uuid,
      'Demo Guest',
      'demo-guest@wadl.test',
      'approved',
      0,
      now(),
      now()
    )
    on conflict (id) do nothing;
  end if;
end$$;

comment on column public.profiles.role is
  'WADL role. Demo users are tagged via raw_user_meta_data.demo = true on auth.users.';
