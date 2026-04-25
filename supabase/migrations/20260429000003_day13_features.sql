-- Day 13: advanced features.

-- ============================================================================
-- Event templates (recurring events foundation).
-- ============================================================================
create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_event_id uuid references public.events(id) on delete set null,
  name text not null,
  config jsonb not null,
  /** Optional cadence in days; null = manual only. */
  cadence_days int,
  /** When the next auto-create should fire if cadence_days is set. */
  next_run_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists event_templates_account_idx on public.event_templates(account_id);

alter table public.event_templates enable row level security;

drop policy if exists "event_templates_select_via_owner" on public.event_templates;
create policy "event_templates_select_via_owner" on public.event_templates
  for select using (
    exists (select 1 from public.accounts a
            where a.id = event_templates.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "event_templates_mutate_via_owner" on public.event_templates;
create policy "event_templates_mutate_via_owner" on public.event_templates
  for all using (
    exists (select 1 from public.accounts a
            where a.id = event_templates.account_id and a.owner_user_id = auth.uid())
  );

-- ============================================================================
-- Photographer role on event_staff. Enum already includes door_staff +
-- door_manager, but enums need ALTER TYPE to add 'photographer'.
-- ============================================================================
do $$ begin
  alter type user_role add value if not exists 'photographer';
exception when duplicate_object then null; end $$;

-- Existing event_staff role check constraint allows 'manager' or 'staff'.
-- Day 5 widened it; let's broaden to also accept 'photographer'.
do $$ begin
  alter table public.event_staff drop constraint if exists event_staff_role_check;
exception when undefined_object then null; end $$;

alter table public.event_staff
  add constraint event_staff_role_check
  check (role in ('manager', 'staff', 'door_staff', 'door_manager', 'photographer'));

-- ============================================================================
-- event_photos: photographer uploads (S3-style URL into event-photos bucket).
-- ============================================================================
create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists event_photos_event_idx on public.event_photos(event_id);

alter table public.event_photos enable row level security;

-- Public read so /e/[id]/gallery works without auth. Writes only via service role.
drop policy if exists "event_photos_public_read" on public.event_photos;
create policy "event_photos_public_read" on public.event_photos
  for select using (true);

create table if not exists public.event_photo_tags (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.event_photos(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create index if not exists event_photo_tags_photo_idx on public.event_photo_tags(photo_id);
create index if not exists event_photo_tags_guest_idx on public.event_photo_tags(guest_id);

alter table public.event_photo_tags enable row level security;
drop policy if exists "event_photo_tags_public_read" on public.event_photo_tags;
create policy "event_photo_tags_public_read" on public.event_photo_tags
  for select using (true);

-- Public-read storage bucket for event-photos. Idempotent.
insert into storage.buckets (id, name, public)
  values ('event-photos', 'event-photos', true)
  on conflict (id) do update set public = excluded.public;

-- ============================================================================
-- webhook_endpoints + webhook_deliveries
-- ============================================================================
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  url text not null,
  /** comma-separated event names (e.g. 'rsvp.created,guest.checked_in') or '*' */
  events text not null default '*',
  secret text not null default encode(gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists webhook_endpoints_account_idx on public.webhook_endpoints(account_id);

alter table public.webhook_endpoints enable row level security;

drop policy if exists "webhook_endpoints_owner_only" on public.webhook_endpoints;
create policy "webhook_endpoints_owner_only" on public.webhook_endpoints
  for all using (
    exists (select 1 from public.accounts a
            where a.id = webhook_endpoints.account_id and a.owner_user_id = auth.uid())
  );

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_name text not null,
  payload jsonb not null,
  status_code int,
  attempt int not null default 0,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_pending_idx
  on public.webhook_deliveries(next_attempt_at)
  where delivered_at is null;
create index if not exists webhook_deliveries_endpoint_idx on public.webhook_deliveries(endpoint_id);

alter table public.webhook_deliveries enable row level security;

drop policy if exists "webhook_deliveries_owner_select" on public.webhook_deliveries;
create policy "webhook_deliveries_owner_select" on public.webhook_deliveries
  for select using (
    exists (
      select 1 from public.webhook_endpoints e
      join public.accounts a on a.id = e.account_id
      where e.id = webhook_deliveries.endpoint_id
        and a.owner_user_id = auth.uid()
    )
  );
