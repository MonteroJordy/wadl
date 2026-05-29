-- Day 5 (pre-step): enum value additions must commit before the rest of
-- the day-5 migration uses them in CHECK constraints. The Supabase CLI
-- wraps each migration file in a transaction, so the new values can't be
-- referenced inside the same file as the ALTER TYPE that introduces them.
-- Splitting the additions into this earlier file is the standard workaround.

alter type user_role        add value if not exists 'door_staff';
alter type user_role        add value if not exists 'door_manager';
alter type check_in_state   add value if not exists 'do_not_admit';
