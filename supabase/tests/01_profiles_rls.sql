-- RLS tests for profiles and the approval gate.
--
-- Run against the project (Supabase SQL editor, or `supabase test db` once the
-- CLI is linked). Silence means every assertion held; a failure raises.
--
-- These exist because an RLS mistake here leaks the whole member directory.
-- They are deliberately written against the database rather than the app, since
-- the app is not the thing being trusted.

-- ------------------------------------------------------------------
-- A pending member sees nothing but their own row.
-- ------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_skills int;
  v_profiles int;
begin
  select id into v_id from public.profiles where status = 'pending' limit 1;
  if v_id is null then
    raise notice 'skipped: no pending profile to test with';
    return;
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text, true);

  select count(*) into v_skills   from public.skills;
  select count(*) into v_profiles from public.profiles;

  perform set_config('role', 'postgres', true);

  if v_skills <> 0 then
    raise exception 'LEAK: pending member read % skill tags', v_skills;
  end if;
  if v_profiles <> 1 then
    raise exception 'LEAK: pending member saw % profiles, expected only their own', v_profiles;
  end if;

  raise notice 'ok: pending member is fully gated';
end $$;

-- ------------------------------------------------------------------
-- A member cannot approve themselves or hand themselves a role.
-- ------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_blocked_status boolean := false;
  v_blocked_role   boolean := false;
begin
  select id into v_id from public.profiles where status = 'pending' limit 1;
  if v_id is null then
    raise notice 'skipped: no pending profile to test with';
    return;
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text, true);

  begin
    update public.profiles set status = 'approved' where id = v_id;
  exception when others then v_blocked_status := true;
  end;

  begin
    update public.profiles set admin_role = 'super_admin' where id = v_id;
  exception when others then v_blocked_role := true;
  end;

  perform set_config('role', 'postgres', true);

  if not v_blocked_status then
    raise exception 'ESCALATION: a pending member approved themselves';
  end if;
  if not v_blocked_role then
    raise exception 'ESCALATION: a member granted themselves super_admin';
  end if;
  if exists (
    select 1 from public.profiles
    where id = v_id and (status <> 'pending' or admin_role is not null)
  ) then
    raise exception 'ESCALATION: the row changed despite the guard trigger';
  end if;

  raise notice 'ok: privileged columns are locked to admins';
end $$;

-- ------------------------------------------------------------------
-- A member may still edit their own ordinary fields.
-- ------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_before text;
begin
  select id, bio into v_id, v_before from public.profiles where status = 'pending' limit 1;
  if v_id is null then
    raise notice 'skipped: no pending profile to test with';
    return;
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text, true);

  update public.profiles set bio = 'rls test bio' where id = v_id;

  perform set_config('role', 'postgres', true);

  if not exists (select 1 from public.profiles where id = v_id and bio = 'rls test bio') then
    raise exception 'REGRESSION: a member cannot edit their own bio';
  end if;

  update public.profiles set bio = v_before where id = v_id;
  raise notice 'ok: members can still edit their own profile';
end $$;
