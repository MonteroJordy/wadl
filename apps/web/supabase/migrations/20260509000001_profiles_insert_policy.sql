-- Day-1's profiles RLS policies covered SELECT and UPDATE for the row's
-- owner but not INSERT — the design assumed the on_auth_user_created
-- trigger would always create the row server-side. That works for the
-- happy path but breaks for users whose auth.users row was created
-- before the trigger existed (e.g. accounts that pre-date a schema
-- reset). The signup flow uses upsert as a safety net for that case,
-- which requires the user to be able to INSERT their own row.
--
-- Allow authenticated users to INSERT a profile row whose id matches
-- their auth.uid(). Same shape as accounts_insert_own.

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
