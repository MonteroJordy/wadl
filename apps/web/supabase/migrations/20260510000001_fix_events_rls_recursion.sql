-- ============================================================================
-- Fix infinite-recursion in RLS for `events`.
--
-- The Day-9 co-owner feature added a policy on `events` that subqueries
-- `event_co_owners`, AND a policy on `event_co_owners` that subqueries
-- `events`. When Postgres applies RLS to either table it has to apply RLS
-- to the other, which loops forever:
--
--   events.policy → SELECT FROM event_co_owners
--   event_co_owners.policy → SELECT FROM events
--   events.policy → SELECT FROM event_co_owners
--   …
--
-- The fix is the standard Postgres pattern: a `SECURITY DEFINER` helper
-- runs as the function owner (postgres role) which bypasses RLS, so the
-- policies can ask "does this user own/co-own this event?" without
-- re-entering the policy chain.
-- ============================================================================

-- --- Helpers -----------------------------------------------------------------

create or replace function public.auth_owns_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.accounts a on a.id = e.account_id
    where e.id = p_event_id
      and a.owner_user_id = auth.uid()
  );
$$;

create or replace function public.auth_co_owns_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_co_owners eco
    join public.profiles p on p.account_id = eco.account_id
    where eco.event_id = p_event_id
      and p.id = auth.uid()
  );
$$;

-- Lock these down — only authenticated app users should call them (anon
-- users can't have an auth.uid() so the result would always be false).
revoke all on function public.auth_owns_event(uuid) from public;
revoke all on function public.auth_co_owns_event(uuid) from public;
grant execute on function public.auth_owns_event(uuid) to authenticated;
grant execute on function public.auth_co_owns_event(uuid) to authenticated;

-- --- Rewrite the cross-referencing policies ---------------------------------

-- `events`: was JOINing event_co_owners → triggers recursion.
drop policy if exists "events_select_via_co_owner" on public.events;
create policy "events_select_via_co_owner" on public.events
  for select using (
    public.auth_co_owns_event(events.id)
  );

-- `event_nights`: same recursion through co-owner chain.
drop policy if exists "event_nights_select_via_co_owner" on public.event_nights;
create policy "event_nights_select_via_co_owner" on public.event_nights
  for select using (
    public.auth_co_owns_event(event_nights.event_id)
  );

-- `event_co_owners`: was JOINing events → other half of the cycle.
drop policy if exists "event_co_owners_select_via_owner_or_self" on public.event_co_owners;
create policy "event_co_owners_select_via_owner_or_self" on public.event_co_owners
  for select using (
    public.auth_owns_event(event_co_owners.event_id)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_id = event_co_owners.account_id
    )
  );

drop policy if exists "event_co_owners_insert_via_owner" on public.event_co_owners;
create policy "event_co_owners_insert_via_owner" on public.event_co_owners
  for insert with check (
    public.auth_owns_event(event_co_owners.event_id)
  );

drop policy if exists "event_co_owners_delete_via_owner" on public.event_co_owners;
create policy "event_co_owners_delete_via_owner" on public.event_co_owners
  for delete using (
    public.auth_owns_event(event_co_owners.event_id)
  );

comment on function public.auth_owns_event(uuid) is
  'RLS helper: true if auth.uid() is the primary owner of the event. SECURITY DEFINER so policies can call it without re-entering RLS.';
comment on function public.auth_co_owns_event(uuid) is
  'RLS helper: true if auth.uid() belongs to a co-owner account on the event. SECURITY DEFINER to break the events ↔ event_co_owners policy cycle.';
