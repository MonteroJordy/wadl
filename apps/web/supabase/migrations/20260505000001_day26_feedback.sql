-- Day 26: Guest post-event feedback survey.

-- ============================================================================
-- event_feedback — one row per guest who responds to the post-event survey.
-- Anonymous responses are also allowed (guest_id null) so a guest who's
-- forgotten which phone they used can still drop a rating.
-- ============================================================================
create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  /** 1..5 stars. */
  rating int not null check (rating between 1 and 5),
  /** Tag picker buckets. Stored as a tiny set of allowed tokens. */
  tags text[] not null default '{}',
  /** Free-text up to 1000 chars. */
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists event_feedback_event_idx
  on public.event_feedback(event_id, created_at desc);

create unique index if not exists event_feedback_one_per_guest
  on public.event_feedback(event_id, guest_id)
  where guest_id is not null;

alter table public.event_feedback enable row level security;

-- Guests can insert their own feedback rows (matched by check_in_token via
-- the server-side action; no direct authed-guest insert path today).
-- Owners can read aggregated feedback for their events.
drop policy if exists "event_feedback_owner_select" on public.event_feedback;
create policy "event_feedback_owner_select" on public.event_feedback
  for select using (
    exists (
      select 1 from public.events e
      join public.accounts a on a.id = e.account_id
      where e.id = event_feedback.event_id and a.owner_user_id = auth.uid()
    )
  );

-- Service-role inserts only (the /e/[id]/feedback action validates the
-- check_in_token then writes via admin client).
