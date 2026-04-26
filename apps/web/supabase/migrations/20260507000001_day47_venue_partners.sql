-- Day 47: venue partners directory for brand + individual accounts.
-- They don't own a venue — they bookmark the rooms they collab with.

create table if not exists public.venue_partners (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  /** Free-text label since the partner venue may not be a WADL account. */
  name text not null,
  city text,
  /** Optional Instagram-style handle. */
  handle text,
  /** Optional notes on the relationship (capacity, default doors, contact). */
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists venue_partners_account_idx
  on public.venue_partners(account_id, name);

alter table public.venue_partners enable row level security;

drop policy if exists "venue_partners_owner_select" on public.venue_partners;
create policy "venue_partners_owner_select" on public.venue_partners
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = venue_partners.account_id and a.owner_user_id = auth.uid()
    )
  );

drop policy if exists "venue_partners_owner_mutate" on public.venue_partners;
create policy "venue_partners_owner_mutate" on public.venue_partners
  for all using (
    exists (
      select 1 from public.accounts a
      where a.id = venue_partners.account_id and a.owner_user_id = auth.uid()
    )
  );
