-- Day 3: allocation_tokens — short random URL tokens for public /h/<token>
-- holder pages. Multiple tokens per allocation allowed (rotation / re-issue).
-- Token lookup happens server-side with the service-role key; owners can
-- SELECT their own tokens via RLS so the detail page can render the link.

create table if not exists public.allocation_tokens (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists allocation_tokens_allocation_id_idx
  on public.allocation_tokens(allocation_id);

create index if not exists allocation_tokens_token_idx
  on public.allocation_tokens(token)
  where revoked_at is null;

alter table public.allocation_tokens enable row level security;

drop policy if exists "allocation_tokens_select_via_owner" on public.allocation_tokens;
create policy "allocation_tokens_select_via_owner" on public.allocation_tokens
  for select using (
    exists (
      select 1 from public.allocations al
      join public.event_nights en on en.id = al.event_night_id
      join public.events e on e.id = en.event_id
      join public.accounts a on a.id = e.account_id
      where al.id = allocation_tokens.allocation_id and a.owner_user_id = auth.uid()
    )
  );

-- No insert/update/delete policies — mutations happen server-side via the
-- service-role key so magic-link generation and revocation are never
-- subject to client RLS.
