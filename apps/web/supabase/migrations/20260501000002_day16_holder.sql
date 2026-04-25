-- Day 16: holder claim — link a phone-verified user to allocations they hold.

-- Already have allocation_tokens. We need a way to claim ownership of those
-- tokens by phone. Approach: when a holder taps "Claim this account" on
-- /h/[token], they sign in via OTP, and we record the link in
-- allocation_owners (allocation_id × user_id, unique).

create table if not exists public.allocation_owners (
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_via_token text,
  claimed_at timestamptz not null default now(),
  primary key (allocation_id, user_id)
);
create index if not exists allocation_owners_user_idx on public.allocation_owners(user_id);

alter table public.allocation_owners enable row level security;

drop policy if exists "alloc_owners_self_select" on public.allocation_owners;
create policy "alloc_owners_self_select" on public.allocation_owners
  for select using (user_id = auth.uid());

drop policy if exists "alloc_owners_self_insert" on public.allocation_owners;
create policy "alloc_owners_self_insert" on public.allocation_owners
  for insert with check (user_id = auth.uid());
