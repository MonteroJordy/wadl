-- Day 10: v1.1 nice-to-haves.

-- ============================================================================
-- guests: notes (free text) and tags (string array, e.g. ["VIP Regular", "Influencer"])
-- ============================================================================
alter table public.guests
  add column if not exists notes text,
  add column if not exists tags text[] not null default '{}';

-- Tier upgrade notification tracking. tier_upgraded_at is set when an owner
-- bumps a guest's tier; tier_upgrade_seen_at is set when the guest views
-- /mytickets after the upgrade so the banner doesn't keep firing.
alter table public.guests
  add column if not exists tier_upgraded_at timestamptz,
  add column if not exists tier_upgrade_seen_at timestamptz;

create index if not exists guests_tags_gin on public.guests using gin (tags);

-- ============================================================================
-- sms_templates: per-account templated messages with {{variables}}
-- ============================================================================
create table if not exists public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  key text not null,
  label text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, key)
);

create index if not exists sms_templates_account_id_idx on public.sms_templates(account_id);

alter table public.sms_templates enable row level security;

drop policy if exists "sms_templates_select_via_owner" on public.sms_templates;
create policy "sms_templates_select_via_owner" on public.sms_templates
  for select using (
    exists (select 1 from public.accounts a
            where a.id = sms_templates.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "sms_templates_insert_via_owner" on public.sms_templates;
create policy "sms_templates_insert_via_owner" on public.sms_templates
  for insert with check (
    exists (select 1 from public.accounts a
            where a.id = sms_templates.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "sms_templates_update_via_owner" on public.sms_templates;
create policy "sms_templates_update_via_owner" on public.sms_templates
  for update using (
    exists (select 1 from public.accounts a
            where a.id = sms_templates.account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.accounts a
            where a.id = sms_templates.account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists "sms_templates_delete_via_owner" on public.sms_templates;
create policy "sms_templates_delete_via_owner" on public.sms_templates
  for delete using (
    exists (select 1 from public.accounts a
            where a.id = sms_templates.account_id and a.owner_user_id = auth.uid())
  );

do $$
declare
  trig_exists boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgname = 'sms_templates_set_updated_at'
  ) into trig_exists;
  if not trig_exists then
    create trigger sms_templates_set_updated_at
      before update on public.sms_templates
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- ============================================================================
-- accounts: Stripe wiring (used only when STRIPE_SECRET_KEY is configured).
-- ============================================================================
alter table public.accounts
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;
