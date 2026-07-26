-- Skill tag moderation.
--
-- merge_skills() is SECURITY DEFINER and rewrites other members' rows, so it is
-- the one function in the schema that could quietly become a privilege
-- escalation. These assertions pin down both halves: that a plain member cannot
-- call it, and that when staff do, nobody's data is lost in the move.

do $$
declare
  v_admin uuid; v_member uuid;
  v_dupe uuid; v_keep uuid;
  v_moved int; v_left int; v_prof public.proficiency;
  v_blocked boolean := false;
begin
  select id into v_admin  from public.profiles where admin_role is not null limit 1;
  select id into v_member from public.profiles
    where status = 'approved' and id <> v_admin limit 1;
  select id into v_keep   from public.skills where slug = 'javascript';

  if v_admin is null or v_member is null or v_keep is null then
    raise notice 'skipped: needs two approved profiles and the seeded tag list';
    return;
  end if;

  insert into public.skills (name, category, is_custom)
    values ('JS', 'Languages', true) returning id into v_dupe;
  insert into public.member_skills (member_id, skill_id, proficiency)
    values (v_member, v_dupe, 'advanced');

  -- A plain member must not be able to merge tags.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  begin
    perform public.merge_skills(v_dupe, v_keep);
  exception when others then v_blocked := true;
  end;
  perform set_config('role', 'postgres', true);

  if not v_blocked then
    raise exception 'FAIL: a non-staff member merged skill tags';
  end if;

  -- Staff can, and the member comes with it.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform public.merge_skills(v_dupe, v_keep);
  perform set_config('role', 'postgres', true);

  select count(*) into v_moved from public.member_skills
    where member_id = v_member and skill_id = v_keep;
  select count(*) into v_left from public.member_skills where skill_id = v_dupe;
  select proficiency into v_prof from public.member_skills
    where member_id = v_member and skill_id = v_keep;

  if v_moved <> 1 then raise exception 'FAIL: member did not move to the surviving tag'; end if;
  if v_left  <> 0 then raise exception 'FAIL: % rows left on the merged-away tag', v_left; end if;
  if v_prof <> 'advanced' then raise exception 'FAIL: proficiency was lost in the merge'; end if;
  if not exists (
    select 1 from public.skills
    where id = v_dupe and is_active = false and merged_into_id = v_keep
  ) then
    raise exception 'FAIL: the merged tag was not marked and redirected';
  end if;

  delete from public.member_skills where member_id = v_member and skill_id = v_keep;
  delete from public.skills where id = v_dupe;
  raise notice 'PASS: merge is staff-only, lossless, and redirects the old tag';
end $$;
