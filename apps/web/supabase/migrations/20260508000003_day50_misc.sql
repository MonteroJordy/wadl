-- Day 50: small additive columns from WADL_BRIEF_V2.md gap matrix.
-- All nullable, all backward compatible.

-- ── Event ends_at ──────────────────────────────────────────────
-- Brief: "Each event has Title, Description, Image (4:5), Date, Start
-- time, End time (optional), Guest list total capacity." Nightlife
-- events run 22:00 → 04:00; door staff need this to know when to flip
-- the policy from "doors open" to "no more arrivals."
alter table public.event_nights
  add column if not exists ends_at timestamptz;

comment on column public.event_nights.ends_at is
  'Optional close-of-doors timestamp. Powers late-arrival policy and event-ended UI states.';

-- ── Split first/last name ──────────────────────────────────────
-- Brief: "first name, last name (separate fields)". Migrate
-- additively — keep full_name for back-compat. Backfill via simple
-- space-split (operators can edit later).
alter table public.guests
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.guests
  set
    first_name = coalesce(first_name, split_part(trim(full_name), ' ', 1)),
    last_name = coalesce(
      last_name,
      nullif(trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1)), '')
    )
  where (first_name is null or last_name is null)
    and full_name is not null
    and length(trim(full_name)) > 0;

comment on column public.guests.first_name is 'Given name (split from full_name on Day 50). full_name retained.';
comment on column public.guests.last_name is 'Family name (split from full_name on Day 50). Nullable.';

-- ── Index improvement: phone lookup for prior-invitee recognition ──
-- The RSVP server action queries guest_identities by phone before
-- writing a new guests row. Index is already unique from migration
-- 20260508000002 — this is a no-op safety check.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'guest_identities'
      and indexname = 'guest_identities_phone_idx'
  ) then
    raise warning 'Run migration 20260508000002 first.';
  end if;
end$$;
