-- External (non-ACM) teammates.
--
-- A guest is a name occupying a slot, nothing more. The interesting part is
-- capacity: team size is now members + guests, and TWO different paths can
-- overfill a team — adding a guest, and approving a join request. Both read
-- public.team_size(), and both are asserted here, because a guest that only
-- counts on one of those paths is worse than no limit at all.

do $$
declare
  v_lead uuid; v_other uuid; v_event uuid; v_team uuid;
  v_guest uuid; v_req uuid; v_err text; v_size int;
begin
  select id into v_lead from public.profiles
    where admin_role is not null and status = 'approved' limit 1;
  -- Deliberately not an admin: is_admin() would pass the write policy on its
  -- own and the "only the lead may add" assertion would prove nothing.
  select id into v_other from public.profiles
    where status = 'approved' and admin_role is null and id <> v_lead limit 1;

  if v_lead is null or v_other is null then
    raise notice 'skipped: needs an approved admin and an approved non-admin';
    return;
  end if;

  -- team_max 3 = the lead plus room for two more.
  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Guest test', 'open', 3, v_lead) returning id into v_event;
  insert into public.teams (event_id, name, lead_id)
  values (v_event, 'Hosts', v_lead) returning id into v_team;

  -- The lead adds someone from outside ACM.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  insert into public.team_guests (team_id, full_name, added_by)
  values (v_team, 'Aditi Sharma', v_lead) returning id into v_guest;
  perform set_config('role', 'postgres', true);

  v_size := public.team_size(v_team);
  if v_size <> 2 then
    raise exception 'FAIL: a guest did not occupy a slot (team_size = %)', v_size;
  end if;

  -- Someone who does not lead the team cannot add to it.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  begin
    insert into public.team_guests (team_id, full_name) values (v_team, 'Uninvited');
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%row-level security%' then
    raise exception 'FAIL: a non-lead added an external member: %', v_err;
  end if;

  -- One more guest fills the team; the next is refused.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  insert into public.team_guests (team_id, full_name) values (v_team, 'Rahul Mehta');
  begin
    insert into public.team_guests (team_id, full_name) values (v_team, 'One Too Many');
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%already full%' then
    raise exception 'FAIL: guests overfilled the team: %', v_err;
  end if;

  -- The other overfill path: a join request must not slip past the guests.
  insert into public.join_requests (team_id, requester_id)
  values (v_team, v_other) returning id into v_req;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  begin
    perform public.respond_to_join_request(v_req, true);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%already full%' then
    raise exception 'FAIL: guests did not count against join approval: %', v_err;
  end if;

  -- Taking a guest off frees the slot again.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  delete from public.team_guests where id = v_guest;
  perform set_config('role', 'postgres', true);

  v_size := public.team_size(v_team);
  if v_size <> 2 then
    raise exception 'FAIL: removing a guest did not free the slot (team_size = %)', v_size;
  end if;

  delete from public.events where id = v_event;
  raise notice 'PASS: external members occupy slots on both capacity paths';
end $$;
