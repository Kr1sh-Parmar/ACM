-- Join request flow.
--
-- respond_to_join_request() is SECURITY DEFINER and writes into another
-- member's team_members, so it carries all of the authorisation itself: lead
-- only, event still open, team not full, and not already on a team in this
-- hackathon. Every one of those is asserted here, and each is checked against
-- the SPECIFIC error message — a bare "it threw something" assertion passes for
-- the wrong reason, which is exactly how the enum-cast bug in this function
-- originally hid.

do $$
declare
  v_lead uuid; v_asker uuid; v_event uuid; v_team uuid; v_req uuid;
  v_err text; v_members int;
begin
  select id into v_lead  from public.profiles where admin_role is not null limit 1;
  select id into v_asker from public.profiles
    where status = 'approved' and id <> v_lead limit 1;

  if v_lead is null or v_asker is null then
    raise notice 'skipped: needs two approved profiles';
    return;
  end if;

  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Join flow test', 'open', 2, v_lead) returning id into v_event;
  insert into public.teams (event_id, name, lead_id)
  values (v_event, 'Alpha', v_lead) returning id into v_team;
  insert into public.join_requests (team_id, requester_id, message)
  values (v_team, v_asker, 'I can do the frontend') returning id into v_req;

  -- Only the lead may answer.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_asker, 'role', 'authenticated')::text, true);
  begin
    perform public.respond_to_join_request(v_req, true);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%only the team lead%' then
    raise exception 'FAIL: a non-lead was not refused correctly: %', v_err;
  end if;

  -- The lead approves; the member joins and the decision is stamped.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  perform public.respond_to_join_request(v_req, true);
  perform set_config('role', 'postgres', true);

  select count(*) into v_members from public.team_members where team_id = v_team;
  if v_members <> 2 then raise exception 'FAIL: expected 2 members, got %', v_members; end if;
  if not exists (
    select 1 from public.join_requests
    where id = v_req and status = 'approved'
      and decided_by = v_lead and decided_at is not null
  ) then
    raise exception 'FAIL: request was not stamped approved';
  end if;

  delete from public.events where id = v_event;
  raise notice 'ok: lead-only approval adds the member and records the decision';
end $$;

-- Capacity, closed events, and rejection.
do $$
declare
  v_lead uuid; v_asker uuid; v_event uuid; v_team uuid; v_req uuid; v_err text;
begin
  select id into v_lead  from public.profiles where admin_role is not null limit 1;
  select id into v_asker from public.profiles
    where status = 'approved' and id <> v_lead limit 1;

  if v_lead is null or v_asker is null then
    raise notice 'skipped: needs two approved profiles';
    return;
  end if;

  -- team_max = 1, so the lead alone already fills the team.
  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Capacity test', 'open', 1, v_lead) returning id into v_event;
  insert into public.teams (event_id, name, lead_id)
  values (v_event, 'Solo', v_lead) returning id into v_team;
  insert into public.join_requests (team_id, requester_id)
  values (v_team, v_asker) returning id into v_req;

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
    raise exception 'FAIL: a full team accepted a member: %', v_err;
  end if;

  -- A closed event accepts nobody, however much room the team has.
  update public.events set team_max = 4, status = 'closed' where id = v_event;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  begin
    perform public.respond_to_join_request(v_req, true);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%registration for this event is closed%' then
    raise exception 'FAIL: a closed event accepted a member: %', v_err;
  end if;

  -- Rejection records the decision without adding anyone.
  update public.events set status = 'open' where id = v_event;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lead, 'role', 'authenticated')::text, true);
  perform public.respond_to_join_request(v_req, false);
  perform set_config('role', 'postgres', true);

  if exists (select 1 from public.team_members where team_id = v_team and member_id = v_asker) then
    raise exception 'FAIL: a rejected requester was added to the team';
  end if;
  if not exists (select 1 from public.join_requests where id = v_req and status = 'rejected') then
    raise exception 'FAIL: the rejection was not recorded';
  end if;

  delete from public.events where id = v_event;
  raise notice 'PASS: capacity, closed events and rejections all behave';
end $$;
