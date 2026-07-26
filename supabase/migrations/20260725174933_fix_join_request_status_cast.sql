-- The CASE produced `text`, which Postgres will not implicitly assign to a
-- request_status column — so approving or rejecting anyone failed outright.
create or replace function public.respond_to_join_request(request_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_status public.event_status;
  v_max smallint;
  v_count int;
begin
  select jr.*, t.event_id, t.lead_id
    into r
  from public.join_requests jr
  join public.teams t on t.id = jr.team_id
  where jr.id = request_id;

  if r is null then raise exception 'no such request'; end if;
  if r.lead_id <> (select auth.uid()) and not public.is_admin() then
    raise exception 'only the team lead can answer this request';
  end if;
  if r.status <> 'pending' then raise exception 'that request was already answered'; end if;

  if approve then
    select e.status, e.team_max into v_status, v_max
    from public.events e where e.id = r.event_id;

    if v_status <> 'open' then
      raise exception 'registration for this event is closed';
    end if;

    select count(*) into v_count from public.team_members where team_id = r.team_id;
    if v_count >= v_max then
      raise exception 'this team is already full';
    end if;

    begin
      insert into public.team_members (team_id, member_id) values (r.team_id, r.requester_id);
    exception when unique_violation then
      raise exception 'they already joined another team in this hackathon';
    end;
  end if;

  update public.join_requests
  set status = (case when approve then 'approved' else 'rejected' end)::public.request_status,
      decided_by = (select auth.uid()),
      decided_at = now()
  where id = request_id;
end;
$$;

revoke execute on function public.respond_to_join_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;
