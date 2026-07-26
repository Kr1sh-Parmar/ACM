-- ============================================================
-- M2: skill directory
-- ============================================================

create type public.proficiency as enum ('beginner', 'intermediate', 'advanced');

create table public.skills (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) between 1 and 40),
  -- Normalised name. Stops "React" / "react " becoming two tags on insert;
  -- genuine synonyms ("JS" vs "JavaScript") are handled by merge_skills below.
  slug           text generated always as (lower(trim(name))) stored unique,
  category       text not null default 'Other',
  is_active      boolean not null default true,
  merged_into_id uuid references public.skills (id) on delete set null,
  is_custom      boolean not null default false,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- A tag cannot point at itself, and a live tag has nothing to merge into.
  constraint skills_merge_sane check (
    merged_into_id is null or (merged_into_id <> id and is_active = false)
  )
);

create index skills_active_idx on public.skills (is_active, category);

create table public.member_skills (
  member_id   uuid not null references public.profiles (id) on delete cascade,
  skill_id    uuid not null references public.skills (id) on delete cascade,
  proficiency public.proficiency not null default 'beginner',
  created_at  timestamptz not null default now(),
  primary key (member_id, skill_id)
);

create index member_skills_skill_idx on public.member_skills (skill_id);

-- ============================================================
-- Tag moderation
-- ============================================================

-- Fold a duplicate tag into the real one and carry every member across.
-- SECURITY DEFINER because it rewrites other members' rows, which no RLS policy
-- allows; the is_staff() check inside is what authorises the call.
create or replace function public.merge_skills(source_id uuid, target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'only chapter staff can merge skill tags';
  end if;
  if source_id = target_id then
    raise exception 'cannot merge a tag into itself';
  end if;
  if not exists (select 1 from public.skills where id = target_id and is_active) then
    raise exception 'target tag must be an active tag';
  end if;

  -- Members already holding the target keep the proficiency they set there.
  insert into public.member_skills (member_id, skill_id, proficiency)
  select ms.member_id, target_id, ms.proficiency
  from public.member_skills ms
  where ms.skill_id = source_id
  on conflict (member_id, skill_id) do nothing;

  delete from public.member_skills where skill_id = source_id;

  update public.skills
  set is_active = false, merged_into_id = target_id
  where id = source_id;
end;
$$;

revoke execute on function public.merge_skills(uuid, uuid) from public, anon;
grant execute on function public.merge_skills(uuid, uuid) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.skills        enable row level security;
alter table public.member_skills enable row level security;

create policy skills_select on public.skills
  for select to authenticated
  using (public.is_approved() or public.is_staff());

-- Approved members may coin a custom tag, but only ever flagged as custom and
-- attributed to them — the WITH CHECK is what stops a member seeding the
-- curated list with an "official" looking tag.
create policy skills_insert_custom on public.skills
  for insert to authenticated
  with check (
    public.is_approved()
    and is_custom = true
    and is_active = true
    and merged_into_id is null
    and created_by = (select auth.uid())
  );

create policy skills_write_staff on public.skills
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy skills_delete_staff on public.skills
  for delete to authenticated
  using (public.is_staff());

-- Everyone approved can read who knows what; that's the point of the directory.
create policy member_skills_select on public.member_skills
  for select to authenticated
  using (public.is_approved() or public.is_staff());

create policy member_skills_write_own on public.member_skills
  for all to authenticated
  using (member_id = (select auth.uid()))
  with check (member_id = (select auth.uid()) and public.is_approved());

grant select, insert, update, delete on public.skills to authenticated;
grant select, insert, update, delete on public.member_skills to authenticated;
