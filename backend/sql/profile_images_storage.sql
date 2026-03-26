-- Run this in Supabase SQL Editor (once).
-- Purpose: create profile image bucket + required RLS policies.

-- 1) Ensure bucket exists and is public (needed for getPublicUrl)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS for storage.objects is managed by Supabase and is already enabled in most projects.
-- Skipping ALTER TABLE here because some SQL roles are not table owners.

-- 3) Create policies if they do not exist (non-destructive)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read profile images'
  ) then
    create policy "Public read profile images"
    on storage.objects
    for select
    to public
    using (bucket_id = 'profile-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload own profile images'
  ) then
    create policy "Authenticated upload own profile images"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'profile-images'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated update own profile images'
  ) then
    create policy "Authenticated update own profile images"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'profile-images'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    with check (
      bucket_id = 'profile-images'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated delete own profile images'
  ) then
    create policy "Authenticated delete own profile images"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'profile-images'
      and (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;
end
$$;
