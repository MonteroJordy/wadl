-- Day 8: Supabase Storage bucket for event flyers.
-- Public read so flyer URLs work everywhere; uploads go through server
-- actions using the service-role key (bypasses RLS).

insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do nothing;

-- Public read of objects in the bucket.
drop policy if exists "event_flyers_public_read" on storage.objects;
create policy "event_flyers_public_read"
  on storage.objects for select
  using (bucket_id = 'event-flyers');
