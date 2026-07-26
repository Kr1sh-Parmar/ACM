-- Event banners. Public bucket, so object URLs work without a SELECT policy;
-- only admins may write. Files live under `<event_id>/banner.<ext>`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners', 'banners', true, 4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Upsert needs INSERT + SELECT + UPDATE, so admins get all three.
create policy banners_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'banners' and public.is_admin());

create policy banners_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'banners' and public.is_admin());

create policy banners_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'banners' and public.is_admin())
  with check (bucket_id = 'banners' and public.is_admin());

create policy banners_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'banners' and public.is_admin());
