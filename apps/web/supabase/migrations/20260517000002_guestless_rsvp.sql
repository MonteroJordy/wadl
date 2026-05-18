-- Guestless RSVP — public list mode.
--
-- An allocation marked `guestless = true` exposes a public RSVP route at
-- /g/{magic_link_token}. The guest enters name + phone, we insert a
-- guests row with status='approved' (auto-approve is implied by guestless)
-- and a fresh qr_token; they get a pass at /g/{token}/pass?g={qr_token}.
--
-- Guests created this way carry guestless=true so the operator and
-- analytics can distinguish them, and phone_unverified=true until they
-- come back to upgrade the account via magic link.

alter table public.allocations
  add column if not exists guestless boolean not null default false;

alter table public.guests
  add column if not exists guestless boolean not null default false,
  add column if not exists phone_unverified boolean not null default false;

create index if not exists allocations_guestless_idx
  on public.allocations(guestless)
  where guestless = true;

create index if not exists guests_phone_lookup_idx
  on public.guests(phone)
  where phone is not null;

comment on column public.allocations.guestless is
  'When true, /g/{magic_link_token} is the public no-account RSVP route. Implies auto_approve.';

comment on column public.guests.guestless is
  'Created via the no-account RSVP flow. Set to false once the guest upgrades to a real account.';
