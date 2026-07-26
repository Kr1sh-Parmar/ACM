-- Team formation rules.
--
-- The headline rule: a member may be on ONE team per hackathon, but any number
-- of teams per project. It is enforced by the `one_team_per_hackathon` partial
-- unique index rather than application code, so it holds under concurrent join
-- approvals. This file is what proves that index is actually wired to the right
-- columns — the denormalised event_type it depends on is filled by a trigger,
-- and a typo there would silently disable the whole rule.
--
-- Needs two approved profiles to run. Creates and deletes its own fixtures.

do $$
declare
  v_admin uuid; v_other uuid;
  v_hack uuid; v_proj uuid;
  h1 uuid; p1 uuid; p2 uuid;
  v_blocked_lead boolean := false;
  v_blocked_leave boolean := false;
  v_proj_teams int;
begin
  select id into v_admin from public.profiles where admin_role is not null limit 1;
  select id into v_other from public.profiles
    where status = 'approved' and id <> v_admin limit 1;

  if v_admin is null or v_other is null then
    raise notice 'skipped: needs two approved profiles';
    return;
  end if;

  insert into public.events (type, title, status, team_max, created_by)
  values ('hackathon', 'Team rules test hackathon', 'open', 4, v_admin) returning id into v_hack;
  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Team rules test project', 'open', 4, v_admin) returning id into v_proj;

  insert into public.teams (event_id, name, lead_id)
  values (v_hack, 'Hack A', v_admin) returning id into h1;

  if exists (select 1 from public.teams where id = h1 and event_type <> 'hackathon') then
    raise exception 'FAIL: teams.event_type was not filled by the trigger';
  end if;
  if not exists (select 1 from public.team_members where team_id = h1 and member_id = v_admin) then
    raise exception 'FAIL: the lead was not added to their own team';
  end if;

  insert into public.team_members (team_id, member_id) values (h1, v_other);

  -- Already on a team in this hackathon, so they cannot lead a second one.
  begin
    insert into public.teams (event_id, name, lead_id) values (v_hack, 'Hack B', v_other);
  exception when unique_violation then v_blocked_lead := true;
  end;
  if not v_blocked_lead then
    raise exception 'FAIL: member led a second team in the same hackathon';
  end if;

  -- Projects deliberately allow overlap.
  insert into public.teams (event_id, name, lead_id) values (v_proj, 'Proj A', v_admin) returning id into p1;
  insert into public.teams (event_id, name, lead_id) values (v_proj, 'Proj B', v_admin) returning id into p2;
  insert into public.team_members (team_id, member_id) values (p1, v_other);
  insert into public.team_members (team_id, member_id) values (p2, v_other);

  select count(*) into v_proj_teams from public.team_members
  where member_id = v_other and event_type = 'project';
  if v_proj_teams <> 2 then
    raise exception 'FAIL: expected 2 project teams, found %', v_proj_teams;
  end if;

  -- A lead walking out would orphan the team.
  begin
    delete from public.team_members where team_id = p1 and member_id = v_admin;
  exception when others then v_blocked_leave := true;
  end;
  if not v_blocked_leave then
    raise exception 'FAIL: the team lead left their own team';
  end if;

  delete from public.events where id in (v_hack, v_proj);
  raise notice 'PASS: hackathon exclusivity, project overlap, lead cannot walk out';
end $$;
