-- Run after schema.sql. Public bucket for project images: anyone can VIEW, only the admin can WRITE.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "project images insert admin" on storage.objects;
create policy "project images insert admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "project images update admin" on storage.objects;
create policy "project images update admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "project images delete admin" on storage.objects;
create policy "project images delete admin" on storage.objects
  for delete to authenticated using (bucket_id = 'project-images' and public.is_admin());
-- No select policy on purpose: files are served through public URLs, but nobody can list the bucket.
