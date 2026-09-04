-- ============================================================
-- External (non-ACM) teammates
--
-- A team can carry people who aren't in the committee. They are not users:
-- no auth row, no profile, no skills, no login — just a name occupying a slot
-- so that the roster and the open-slot count tell the truth. Kept in their own
-- table rather than as nullable columns on team_members, so nothing that reads
-- a member (the dashboard, the directory, one_team_per_hackathon) has to learn
-- about a row that has no profile behind it.
-- ============================================================

create table public.team_guests (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  full_name  text not null check (length(trim(full_name)) between 2 and 80),
  added_by   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A team is a handful of people; the same name twice is a double-submit.
  unique (team_id, full_name)
);

create index team_guests_team_idx on public.team_guests (team_id);

-- Everyone occupying a slot, members and guests alike.
--
-- Two different paths can overfill a team — adding a guest, and approving a
-- join request — and before guests existed the second one counted rows itself.
-- Both now read this, so they cannot come to different conclusions about
-- whether a team is full. Not granted to anyone: its only callers are the
-- SECURITY DEFINER function and trigger below, which run as the owner.
create or replace function public.team_size(p_team_id uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.team_members where team_id = p_team_id)
       + (select count(*) from public.team_guests  where team_id = p_team_id);
$$;

revoke execute on function public.team_size(uuid) from public, anon, authenticated;

-- Capacity lives in the database, like every other team rule here — the button
-- that hides itself when a team is full is a courtesy, not the limit.
create or replace function public.guard_team_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_max smallint;
begin
  select e.team_max into v_max
  from public.teams t join public.events e on e.id = t.event_id
  where t.id = new.team_id;

  if v_max is null then raise exception 'no such team'; end if;
  if public.team_size(new.team_id) >= v_max then
    raise exception 'this team is already full';
  end if;

  return new;
end;
$$;

create trigger team_guests_guard_capacity
  before insert on public.team_guests
  for each row execute function public.guard_team_capacity();

revoke execute on function public.guard_team_capacity() from public, anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.team_guests enable row level security;

-- Rosters are readable by any approved member, same as team_members.
create policy team_guests_select on public.team_guests
  for select to authenticated
  using (public.is_approved());

-- Only the lead fills their own slots. Adding is limited to open events, the
-- way creating a team and requesting to join are; removing is not, so a lead
-- can still correct a roster after registration closes.
--
-- team_guests.team_id is written out in full on purpose: unqualified, that name
-- would bind to the sub-select's own table instead of the new row, which is
-- exactly the bug that broke join requests.
create policy team_guests_write on public.team_guests
  for all to authenticated
  using (public.leads_team(team_id) or public.is_admin())
  with check (
    (public.leads_team(team_id) or public.is_admin())
    and exists (
      select 1 from public.teams t
      join public.events e on e.id = t.event_id
      where t.id = team_guests.team_id and e.status = 'open'
    )
  );

grant select, insert, delete on public.team_guests to authenticated;

-- ============================================================
-- Join approval has to see guests too
-- ============================================================

create or replace function public.respond_to_join_request(request_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_status public.event_status;
  v_max smallint;
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

    -- Counts guests, so external teammates cannot be squeezed out by an
    -- approval that only looked at team_members.
    if public.team_size(r.team_id) >= v_max then
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
