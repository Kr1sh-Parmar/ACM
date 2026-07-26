-- A public bucket serves object URLs without any storage.objects SELECT policy.
-- The broad policy only added the ability to LIST every file, so scope it to the
-- owner's own folder (still needed, because upsert requires INSERT+SELECT+UPDATE).
drop policy if exists avatars_public_read on storage.objects;

create policy avatars_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Trigger functions are invoked by the trigger as the table owner; they never need
-- to be reachable at /rest/v1/rpc/. Postgres grants EXECUTE to PUBLIC by default,
-- which was quietly publishing them as API endpoints.
revoke execute on function
  public.handle_new_user(),
  public.write_audit_log(),
  public.guard_profile_privileged_columns(),
  public.touch_updated_at()
from public, anon, authenticated;

-- These are safe to call (each only reports on the caller's own row) but anon has
-- no use for them.
revoke execute on function
  public.is_approved(), public.is_admin(),
  public.is_super_admin(), public.is_staff()
from anon;
