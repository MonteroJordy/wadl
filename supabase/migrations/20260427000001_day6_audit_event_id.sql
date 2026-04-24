-- Day 6: audit log viewer needs to filter by event.
-- Denormalize event_id onto audit_log so the viewer can avoid a 3-way join
-- (audit_log → guests/allocations → event_nights → events) on every request.

alter table public.audit_log
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists audit_log_event_id_idx
  on public.audit_log(event_id)
  where event_id is not null;

-- Existing rows (from prior test sessions) keep event_id = null; the viewer
-- is event-scoped and simply excludes them. No attempt to backfill.
