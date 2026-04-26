-- Day 19 P1-6: widen staff_invites.role check constraint to include
-- photographer. The event_staff table was widened on Day 13; staff_invites
-- was missed.
do $$ begin
  alter table public.staff_invites drop constraint if exists staff_invites_role_check;
exception when undefined_object then null; end $$;

alter table public.staff_invites
  add constraint staff_invites_role_check
  check (role in ('door_staff', 'door_manager', 'photographer'));
