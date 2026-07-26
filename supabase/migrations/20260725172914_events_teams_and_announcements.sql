-- ============================================================
-- M3 + M4 + M5: events, teams, join requests, announcements
-- ============================================================

create type public.event_type    as enum ('hackathon', 'project');
create type public.event_status  as enum ('draft', 'open', 'closed');
create type public.request_status as enum ('pending', 'approved', 'rejected');

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  type          public.event_type not null,
  title         text not null check (length(trim(title)) between 3 and 120),
  description   text,
  banner_url    text,
  tracks        text[] not null default '{}',
  start_date    date,
  end_date      date,
  registration_deadline date,
  team_min      smallint not null default 1 check (team_min >= 1),
  team_max      smallint not null default 4 check (team_max >= 1),
  status        public.event_status not null default 'draft',
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (team_max >= team_min),
  check (end_date is null or start_date is null or end_date >= start_date),
  -- Referenced by the composite FK on teams. This is what lets the
  -- one-team-per-hackathon rule be a plain unique index instead of a trigger.
  unique (id, type)
);

create index events_status_idx on public.events (status, start_date desc);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  -- Denormalised copy of events.type, kept honest by the composite FK below.
  -- Never set by the client: the fill_team_event_type trigger writes it.
  event_type  public.event_type not null,
  name        text not null check (length(trim(name)) between 2 and 60),
  description text check (length(description) <= 1000),
  track       text,
  lead_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  foreign key (event_id, event_type)
    references public.events (id, type) on update cascade on delete cascade,
  unique (event_id, name),
  unique (id, event_id, event_type)
);

create index teams_event_idx on public.teams (event_id);
create index teams_lead_idx on public.teams (lead_id);

create table public.team_required_skills (
  team_id  uuid not null references public.teams (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (team_id, skill_id)
);

create table public.team_members (
  team_id    uuid not null,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid not null,
  event_type public.event_type not null,
  joined_at  timestamptz not null default now(),
  primary key (team_id, member_id),
  foreign key (team_id, event_id, event_type)
    references public.teams (id, event_id, event_type) on update cascade on delete cascade
);

-- THE rule: one team per member per hackathon, unlimited teams per project.
-- Declarative, so it holds under concurrent join approvals — no trigger, no race.
create unique index one_team_per_hackathon
  on public.team_members (member_id, event_id)
  where event_type = 'hackathon';

create index team_members_member_idx on public.team_members (member_id);

create table public.join_requests (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message      text check (length(message) <= 300),
  status       public.request_status not null default 'pending',
  decided_by   uuid references public.profiles (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- One live request per person per team; re-requesting after a rejection is fine.
create unique index one_pending_request_per_team
  on public.join_requests (team_id, requester_id)
  where status = 'pending';

create index join_requests_team_idx on public.join_requests (team_id, status);
create index join_requests_requester_idx on public.join_requests (requester_id);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(trim(title)) between 3 and 120),
  body       text not null check (length(trim(body)) between 1 and 4000),
  pinned     boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_feed_idx on public.announcements (pinned desc, created_at desc);

-- ============================================================
-- Keep the denormalised event columns correct
-- ============================================================

create or replace function public.fill_team_event_type()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select type into new.event_type from public.events where id = new.event_id;
  if new.event_type is null then
    raise exception 'no such event';
  end if;
  return new;
end;
$$;

create trigger teams_fill_event_type
  before insert or update of event_id on public.teams
  for each row execute function public.fill_team_event_type();

create or replace function public.fill_team_member_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select event_id, event_type into new.event_id, new.event_type
  from public.teams where id = new.team_id;
  if new.event_id is null then
    raise exception 'no such team';
  end if;
  return new;
end;
$$;

create trigger team_members_fill_event
  before insert on public.team_members
  for each row execute function public.fill_team_member_event();

-- The person who starts a team is on it.
create or replace function public.add_lead_as_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.team_members (team_id, member_id) values (new.id, new.lead_id);
  return new;
end;
$$;

create trigger teams_add_lead
  after insert on public.teams
  for each row execute function public.add_lead_as_member();

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create trigger announcements_touch_updated_at
  before update on public.announcements
  for each row execute function public.touch_updated_at();

create trigger events_audit
  after insert or update or delete on public.events
  for each row execute function public.write_audit_log();

create trigger announcements_audit
  after insert or update or delete on public.announcements
  for each row execute function public.write_audit_log();

revoke execute on function
  public.fill_team_event_type(), public.fill_team_member_event(), public.add_lead_as_member()
from public, anon, authenticated;
