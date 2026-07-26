-- Profile photos are replaced by generated identicons rendered client-side.
--
-- The chapter expects ~100 members. Avatars were capped at 2 MB, so a single
-- directory page load could pull ~150 MB of images, against a free-tier budget
-- of 5 GB egress a month. An identicon derived from the member id is DOM, not
-- an image: zero storage, zero bandwidth, nothing to resize, and no upload path
-- to validate. It also cannot 404 or go stale.

alter table public.profiles drop column if exists photo_url;

-- The avatars bucket's four owner-scoped policies existed only for uploads that
-- can no longer happen. Without them the bucket is inert. Banners are
-- untouched - events still use them.
--
-- The empty bucket row itself stays: storage.protect_delete() blocks deleting
-- from storage tables in SQL, and an empty bucket with no policies costs
-- nothing. Remove it from the dashboard if it ever bothers anyone.
drop policy if exists avatars_owner_read   on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;
