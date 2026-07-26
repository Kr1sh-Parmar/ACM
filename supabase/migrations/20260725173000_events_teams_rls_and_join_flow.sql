-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.leads_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.lead_id = (select auth.uid())
  );
$$;

create or replace function public.event_is_visible(p_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and (e.status <> 'draft' or public.is_staff())
  );
$$;

revoke execute on function public.leads_team(uuid), public.event_is_visible(uuid) from public, anon;
grant execute on function public.leads_team(uuid), public.event_is_visible(uuid) to authenticated;

-- ============================================================
-- Join request decisions
--
-- SECURITY DEFINER because approving a request inserts a row into another
-- member's team_members, which no client-side policy allows. The lead check
-- inside is the authorisation.
-- ============================================================

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

    -- Raises unique_violation via one_team_per_hackathon if the requester is
    -- already on a team for this hackathon. Translated for the UI.
    begin
      insert into public.team_members (team_id, member_id) values (r.team_id, r.requester_id);
    exception when unique_violation then
      raise exception 'they already joined another team in this hackathon';
    end;
  end if;

  update public.join_requests
  set status = case when approve then 'approved' else 'rejected' end,
      decided_by = (select auth.uid()),
      decided_at = now()
  where id = request_id;
end;
$$;

revoke execute on function public.respond_to_join_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;

-- A team without its lead is orphaned. Leads disband or hand over, they don't
-- quietly walk out.
create or replace function public.block_lead_leaving()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.teams t where t.id = old.team_id and t.lead_id = old.member_id) then
    raise exception 'the team lead cannot leave; disband the team or hand it over first';
  end if;
  return old;
end;
$$;

create trigger team_members_block_lead_leaving
  before delete on public.team_members
  for each row execute function public.block_lead_leaving();

revoke execute on function public.block_lead_leaving() from public, anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.events               enable row level security;
alter table public.teams                enable row level security;
alter table public.team_required_skills enable row level security;
alter table public.team_members         enable row level security;
alter table public.join_requests        enable row level security;
alter table public.announcements        enable row level security;

-- Events: drafts are staff-only until an admin opens them.
create policy events_select on public.events
  for select to authenticated
  using ((public.is_approved() and status <> 'draft') or public.is_staff());

create policy events_write_admin on public.events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Teams
create policy teams_select on public.teams
  for select to authenticated
  using (public.is_approved() and public.event_is_visible(event_id));

create policy teams_insert on public.teams
  for insert to authenticated
  with check (
    public.is_approved()
    and lead_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'open')
  );

create policy teams_update on public.teams
  for update to authenticated
  using (lead_id = (select auth.uid()) or public.is_admin())
  with check (lead_id = (select auth.uid()) or public.is_admin());

create policy teams_delete on public.teams
  for delete to authenticated
  using (lead_id = (select auth.uid()) or public.is_admin());

-- Required skills: the lead decides what the team is missing.
create policy team_required_skills_select on public.team_required_skills
  for select to authenticated
  using (public.is_approved());

create policy team_required_skills_write on public.team_required_skills
  for all to authenticated
  using (public.leads_team(team_id) or public.is_admin())
  with check (public.leads_team(team_id) or public.is_admin());

-- Team members: readable by all approved members; rows are only ever created by
-- the add_lead_as_member trigger or respond_to_join_request, never by a client.
create policy team_members_select on public.team_members
  for select to authenticated
  using (public.is_approved());

create policy team_members_delete on public.team_members
  for delete to authenticated
  using (
    member_id = (select auth.uid())      -- leave
    or public.leads_team(team_id)        -- lead removes someone
    or public.is_admin()
  );

-- Join requests
create policy join_requests_select on public.join_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or public.leads_team(team_id)
    or public.is_staff()
  );

create policy join_requests_insert on public.join_requests
  for insert to authenticated
  with check (
    public.is_approved()
    and requester_id = (select auth.uid())
    and status = 'pending'
    and not exists (
      select 1 from public.team_members tm
      where tm.team_id = team_id and tm.member_id = (select auth.uid())
    )
    and exists (
      select 1 from public.teams t
      join public.events e on e.id = t.event_id
      where t.id = team_id and e.status = 'open'
    )
  );

-- Withdraw your own request. Approving/rejecting goes through the function.
create policy join_requests_delete_own on public.join_requests
  for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending');

-- Announcements
create policy announcements_select on public.announcements
  for select to authenticated
  using (public.is_approved() or public.is_staff());

create policy announcements_write_admin on public.announcements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_required_skills to authenticated;
grant select, delete on public.team_members to authenticated;
grant select, insert, delete on public.join_requests to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

-- Live badges on join requests.
alter publication supabase_realtime add table public.join_requests;
