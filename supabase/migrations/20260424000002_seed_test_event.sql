-- Day 2 seed: test event with two nights.
-- Idempotent:
--   · no-op if no venue account exists (e.g. first apply before signup)
--   · no-op if the first account already has events
-- Intended re-run after completing onboarding:
--   psql "$SUPABASE_DB_URL" -f supabase/migrations/20260424000002_seed_test_event.sql

do $$
declare
  seed_account_id uuid;
  seed_user_id    uuid;
  seed_venue_id   uuid;
  seed_event_id   uuid;
  existing_events int;
begin
  select a.id, a.owner_user_id
    into seed_account_id, seed_user_id
  from public.accounts a
  where a.account_type = 'venue'
  order by a.created_at asc
  limit 1;

  if seed_account_id is null then
    raise notice 'WADL seed: no venue account yet — skipping.';
    return;
  end if;

  select count(*) into existing_events
  from public.events
  where account_id = seed_account_id;

  if existing_events > 0 then
    raise notice 'WADL seed: account % already has events — skipping.', seed_account_id;
    return;
  end if;

  select id into seed_venue_id
  from public.venues
  where account_id = seed_account_id
  order by created_at asc
  limit 1;

  insert into public.events (account_id, venue_id, event_type, name, description, created_by)
  values (
    seed_account_id,
    seed_venue_id,
    'venue_owned',
    'WADL Test Night',
    'Seed event so the dashboard has data to render.',
    seed_user_id
  )
  returning id into seed_event_id;

  insert into public.event_nights (event_id, night_date, doors_at, capacity_cap, lockdown_threshold_pct)
  values
    (seed_event_id, current_date + 1,
     ((current_date + 1)::timestamp + interval '22 hours') at time zone 'America/New_York',
     400, 90),
    (seed_event_id, current_date + 2,
     ((current_date + 2)::timestamp + interval '22 hours') at time zone 'America/New_York',
     400, 90);

  raise notice 'WADL seed: created event % for account %', seed_event_id, seed_account_id;
end $$;
