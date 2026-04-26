-- Day 42: account social handle for brand + individual accounts.
-- Venue accounts have a venue.name; brands and individuals don't, so they
-- often want to surface their @ handle as the canonical identity instead.

alter table public.accounts
  add column if not exists handle text;

create index if not exists accounts_handle_idx on public.accounts(handle)
  where handle is not null;

-- City stored on the account too — brands + individuals operate out of a
-- city even though they don't own a venue there. Venue accounts already
-- have city via venues.city, but capturing on accounts means the dashboard
-- can show "Mainframe · Miami" without joining venues.
alter table public.accounts
  add column if not exists city text;
