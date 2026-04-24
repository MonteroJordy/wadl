-- Day 4: guest RSVP + phone verify + QR delivery.
-- Adds check_in_token (unique UUID scanned at the door) and phone_verified_at
-- (records OTP completion for walk-up RSVPs).

alter table public.guests
  add column if not exists check_in_token uuid unique default gen_random_uuid(),
  add column if not exists phone_verified_at timestamptz;

-- Backfill any rows created before this migration so the column is populated.
update public.guests
  set check_in_token = gen_random_uuid()
  where check_in_token is null;

create index if not exists guests_check_in_token_idx
  on public.guests(check_in_token)
  where check_in_token is not null;

-- Fast lookup for /mytickets: guests queried by phone.
create index if not exists guests_phone_verified_at_idx
  on public.guests(phone)
  where phone_verified_at is not null;
