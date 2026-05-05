-- Day 50: per-tier sub-caps + sub-tokens.
-- The wedge feature from WADL_BRIEF_V2_GAP.md. Without this, scorecards
-- score "Diplo brought 25, 18 showed up — 72%". WITH this, scorecards
-- score "Diplo's AAA went 5/5 (100%) but his GA went 4/10 (40%)". The
-- second is the data venues will pay for.
--
-- Pattern: one row per (allocation, tier). Each row has its own cap and
-- a unique sub_token used to mint a tier-scoped public sign-up URL.
-- Sum-cap constraint enforced by trigger so the per-tier caps never
-- exceed the parent allocation's overall cap.
--
-- Backfill: every existing allocation gets one tier_cap row at
-- tier='ga' with cap = allocations.cap. No data loss; existing public
-- URLs keep working through the legacy allocation_tokens path.

create table if not exists public.allocation_tier_caps (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  tier text not null check (tier in ('ga', 'vip', 'aaa')),
  cap integer not null check (cap >= 0),
  sub_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (allocation_id, tier)
);

create index if not exists allocation_tier_caps_allocation_id_idx
  on public.allocation_tier_caps(allocation_id);

create index if not exists allocation_tier_caps_sub_token_idx
  on public.allocation_tier_caps(sub_token)
  where revoked_at is null;

-- Sum-cap constraint: per-tier caps within an allocation cannot exceed
-- the parent allocation cap. Enforced by trigger because Postgres
-- doesn't let us reference the parent table in a CHECK.
create or replace function public.allocation_tier_caps_sum_check()
returns trigger language plpgsql as $$
declare
  parent_cap integer;
  total_caps integer;
begin
  select al.cap into parent_cap
    from public.allocations al where al.id = new.allocation_id;
  select coalesce(sum(cap), 0) into total_caps
    from public.allocation_tier_caps
    where allocation_id = new.allocation_id
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  if total_caps + new.cap > parent_cap then
    raise exception 'tier caps (%) exceed allocation cap (%)',
      total_caps + new.cap, parent_cap;
  end if;
  return new;
end$$;

drop trigger if exists allocation_tier_caps_sum_check_t on public.allocation_tier_caps;
create trigger allocation_tier_caps_sum_check_t
  before insert or update on public.allocation_tier_caps
  for each row execute function public.allocation_tier_caps_sum_check();

-- RLS — owners can read tier caps for their allocations; mutations
-- happen server-side via service role (same pattern as allocation_tokens).
alter table public.allocation_tier_caps enable row level security;

drop policy if exists "tier_caps_select_via_owner" on public.allocation_tier_caps;
create policy "tier_caps_select_via_owner" on public.allocation_tier_caps
  for select using (
    exists (
      select 1 from public.allocations al
      join public.event_nights en on en.id = al.event_night_id
      join public.events e on e.id = en.event_id
      join public.accounts a on a.id = e.account_id
      where al.id = allocation_tier_caps.allocation_id
        and a.owner_user_id = auth.uid()
    )
  );

-- Holders authenticated via magic-link token also need to see their own
-- tier caps so the holder console can render per-tier link buttons.
-- The magic-link path doesn't use auth.uid() — it uses
-- allocation_tokens.token validated server-side. So we don't add a
-- holder-side select policy here; holder-side reads happen with the
-- service role inside the /h/[token] page.

-- Backfill — one row at tier='ga' per existing allocation.
insert into public.allocation_tier_caps (allocation_id, tier, cap)
  select al.id, 'ga', al.cap
    from public.allocations al
    on conflict (allocation_id, tier) do nothing;

-- Drop helper for accessing tier caps by token.
create or replace function public.tier_cap_by_sub_token(t text)
returns table (
  id uuid,
  allocation_id uuid,
  tier text,
  cap integer,
  used integer
)
language sql stable as $$
  select
    tc.id,
    tc.allocation_id,
    tc.tier,
    tc.cap,
    coalesce((
      select sum(1 + g.plus_ones)
      from public.guests g
      where g.allocation_id = tc.allocation_id
        and g.tier = tc.tier
        and g.status in ('approved', 'pending')
    ), 0)::integer as used
  from public.allocation_tier_caps tc
  where tc.sub_token = t
    and tc.revoked_at is null;
$$;

comment on table public.allocation_tier_caps is
  'Per-tier sub-caps + sub-tokens for an allocation. The product wedge: lets a holder share three different links (one per tier) routing to the right credential bucket.';
