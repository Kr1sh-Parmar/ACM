-- ============================================================
-- M1: profiles, approval workflow, audit log
-- ============================================================

create type public.profile_status as enum ('pending', 'approved', 'rejected', 'needs_info');
create type public.admin_role as enum ('super_admin', 'admin', 'moderator');

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null check (length(trim(full_name)) between 2 and 80),
  email         text not null unique,
  designation   text,
  branch        text,
  year          smallint check (year between 1 and 5),
  birth_date    date check (birth_date > '1950-01-01' and birth_date < current_date),
  photo_url     text,
  bio           text check (length(bio) <= 500),
  github_url    text,
  linkedin_url  text,
  status        public.profile_status not null default 'pending',
  admin_role    public.admin_role,
  open_to_invites boolean not null default true,
  review_note   text,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.profiles.review_note is
  'Admin-written reason for rejection, or the question asked when status = needs_info.';

create index profiles_status_idx on public.profiles (status);
create index profiles_open_to_invites_idx on public.profiles (open_to_invites) where status = 'approved';

create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  target_table text not null,
  target_id    text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- ============================================================
-- Auth helpers.
-- SECURITY DEFINER so RLS policies on `profiles` don't recurse into themselves.
-- Each one reads ONLY the caller's own row, so it leaks nothing.
-- ============================================================

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  );
$$;

-- Approve/reject rights.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.admin_role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.admin_role = 'super_admin'
  );
$$;

-- Any privileged seat, moderators included. Read access to admin surfaces.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.admin_role is not null
  );
$$;

revoke execute on function public.is_approved(), public.is_admin(),
  public.is_super_admin(), public.is_staff() from public;
grant execute on function public.is_approved(), public.is_admin(),
  public.is_super_admin(), public.is_staff() to authenticated;

-- ============================================================
-- Triggers
-- ============================================================

-- Every auth signup gets a profile row immediately, in `pending`.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A member may edit their own row, but must not approve themselves or grant
-- themselves a role. Column-level GRANTs can't express this because admins and
-- members are both the `authenticated` role, so it's enforced here instead.
create or replace function public.guard_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
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

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- One generic audit trigger, attached to every table worth tracking. Server
-- Actions never write audit rows by hand, so a new code path cannot forget to log.
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_action text;
  v_meta   jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    v_action := TG_TABLE_NAME || '.created';
  elsif TG_OP = 'DELETE' then
    v_action := TG_TABLE_NAME || '.deleted';
  else
    -- Only status transitions on profiles are interesting; ordinary profile
    -- edits would otherwise flood the log.
    if TG_TABLE_NAME = 'profiles' then
      if new.status is not distinct from old.status then
        return new;
      end if;
      v_action := 'profiles.status_changed';
      v_meta := jsonb_build_object(
        'from', old.status, 'to', new.status, 'note', new.review_note
      );
    else
      v_action := TG_TABLE_NAME || '.updated';
    end if;
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, meta)
  values (
    (select auth.uid()),
    v_action,
    TG_TABLE_NAME,
    case when TG_OP = 'DELETE' then old.id::text else new.id::text end,
    v_meta
  );

  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.write_audit_log();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.audit_log enable row level security;

-- Own row always; other members only once BOTH sides are approved; staff see all.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (public.is_approved() and status = 'approved')
    or public.is_staff()
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT policy: rows come only from the handle_new_user trigger.
-- No DELETE policy: removing a member is done by deleting the auth user.

create policy audit_log_select_staff on public.audit_log
  for select to authenticated
  using (public.is_staff());
-- No write policies: audit rows are written solely by the SECURITY DEFINER trigger.

grant select, update on public.profiles to authenticated;
grant select on public.audit_log to authenticated;

-- Live badge counts on the approval queue.
alter publication supabase_realtime add table public.profiles;
