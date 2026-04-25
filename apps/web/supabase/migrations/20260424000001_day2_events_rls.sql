-- Day 2: events + event_nights + event_staff RLS, is_frozen column.

alter table public.event_nights
  add column if not exists is_frozen boolean not null default false;

-- events: scoped by account ownership.
drop policy if exists "events_select_via_account" on public.events;
create policy "events_select_via_account" on public.events
  for select using (
    exists (select 1 from public.accounts a
            where a.id = events.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "events_insert_via_account" on public.events;
create policy "events_insert_via_account" on public.events
  for insert with check (
    exists (select 1 from public.accounts a
            where a.id = events.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "events_update_via_account" on public.events;
create policy "events_update_via_account" on public.events
  for update using (
    exists (select 1 from public.accounts a
            where a.id = events.account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.accounts a
            where a.id = events.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "events_delete_via_account" on public.events;
create policy "events_delete_via_account" on public.events
  for delete using (
    exists (select 1 from public.accounts a
            where a.id = events.account_id and a.owner_user_id = auth.uid())
  );

-- event_nights: scoped through event → account.
drop policy if exists "event_nights_select_via_event" on public.event_nights;
create policy "event_nights_select_via_event" on public.event_nights
  for select using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_nights.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_nights_insert_via_event" on public.event_nights;
create policy "event_nights_insert_via_event" on public.event_nights
  for insert with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_nights.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_nights_update_via_event" on public.event_nights;
create policy "event_nights_update_via_event" on public.event_nights
  for update using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_nights.event_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_nights.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_nights_delete_via_event" on public.event_nights;
create policy "event_nights_delete_via_event" on public.event_nights
  for delete using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_nights.event_id and a.owner_user_id = auth.uid())
  );

-- event_staff: account owner manages; staff may read their own rows.
drop policy if exists "event_staff_select_via_event_or_self" on public.event_staff;
create policy "event_staff_select_via_event_or_self" on public.event_staff
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.events e
      join public.accounts a on a.id = e.account_id
      where e.id = event_staff.event_id and a.owner_user_id = auth.uid()
    )
  );

drop policy if exists "event_staff_insert_via_event" on public.event_staff;
create policy "event_staff_insert_via_event" on public.event_staff
  for insert with check (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_staff.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_staff_update_via_event" on public.event_staff;
create policy "event_staff_update_via_event" on public.event_staff
  for update using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_staff.event_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_staff_delete_via_event" on public.event_staff;
create policy "event_staff_delete_via_event" on public.event_staff
  for delete using (
    exists (select 1 from public.events e
            join public.accounts a on a.id = e.account_id
            where e.id = event_staff.event_id and a.owner_user_id = auth.uid())
  );

-- allocations, guests, check_ins: owner-scoped via event_night → event → account.
-- Magic-link / holder / door writes use service-role server-side and bypass RLS.

drop policy if exists "allocations_select_via_owner" on public.allocations;
create policy "allocations_select_via_owner" on public.allocations
  for select using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = allocations.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "allocations_insert_via_owner" on public.allocations;
create policy "allocations_insert_via_owner" on public.allocations
  for insert with check (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = allocations.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "allocations_update_via_owner" on public.allocations;
create policy "allocations_update_via_owner" on public.allocations
  for update using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = allocations.event_night_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = allocations.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "allocations_delete_via_owner" on public.allocations;
create policy "allocations_delete_via_owner" on public.allocations
  for delete using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = allocations.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "guests_select_via_owner" on public.guests;
create policy "guests_select_via_owner" on public.guests
  for select using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = guests.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "guests_insert_via_owner" on public.guests;
create policy "guests_insert_via_owner" on public.guests
  for insert with check (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = guests.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "guests_update_via_owner" on public.guests;
create policy "guests_update_via_owner" on public.guests
  for update using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = guests.event_night_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = guests.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "guests_delete_via_owner" on public.guests;
create policy "guests_delete_via_owner" on public.guests
  for delete using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = guests.event_night_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "check_ins_select_via_owner" on public.check_ins;
create policy "check_ins_select_via_owner" on public.check_ins
  for select using (
    exists (select 1 from public.event_nights en
            join public.events e on e.id = en.event_id
            join public.accounts a on a.id = e.account_id
            where en.id = check_ins.event_night_id and a.owner_user_id = auth.uid())
  );
