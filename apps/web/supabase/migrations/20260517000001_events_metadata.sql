-- events.metadata: jsonb bag for per-event extras that don't yet have
-- a dedicated table. Currently stores the per-tier credentials array
-- (label / cap / tone / slug) used by the V5CreateEventV2 form. A real
-- `event_tiers` table will replace this once per-tier shareable links
-- and live cap enforcement land.

alter table public.events
  add column if not exists metadata jsonb;

comment on column public.events.metadata is
  'Bag for per-event extras; currently stores tiers[] (label/cap/tone/slug). Move to dedicated event_tiers table when per-tier links land.';
