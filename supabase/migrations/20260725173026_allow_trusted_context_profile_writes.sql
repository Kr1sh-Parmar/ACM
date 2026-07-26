-- auth.uid() is null only when there is no JWT at all — a direct SQL session or
-- the service_role key. Both are already fully trusted contexts, and this is the
-- only way to appoint the first super admin (who by definition has no admin to
-- promote them). Members always carry a `sub` claim, so this cannot be reached
-- from the client.
create or replace function public.guard_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.admin_role is distinct from old.admin_role and not public.is_super_admin() then
    raise exception 'only a super admin can change admin_role';
  end if;

  if (new.status      is distinct from old.status
   or new.review_note is distinct from old.review_note
   or new.reviewed_by is distinct from old.reviewed_by
   or new.reviewed_at is distinct from old.reviewed_at)
   and not public.is_admin() then
    raise exception 'only an admin can change approval status';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_privileged_columns() from public, anon, authenticated;
