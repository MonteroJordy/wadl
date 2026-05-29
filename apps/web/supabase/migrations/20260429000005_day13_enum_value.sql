-- Day 13 (pre-step): photographer enum value addition committed before the
-- main day-13 migration uses it in a CHECK constraint. Same pattern as the
-- day-5 enum split.
do $$ begin
  alter type user_role add value if not exists 'photographer';
exception when duplicate_object then null; end $$;
