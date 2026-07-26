# Phase 4A — Participation & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members check themselves into events with a rotating code, derive contribution points from that, and give admins a leaderboard and an analytics dashboard with CSV export.

**Architecture:** Attendance is one table whose only writers are `SECURITY DEFINER` functions — there are no direct write policies, so authorisation cannot be bypassed by a crafted PostgREST call. The check-in code is *derived* from an HMAC of the event's secret and the current minute rather than stored, so there is no code table to expire or garbage-collect and no race between simultaneous check-ins. Contribution points are a view over attendance, teams and events joined against an editable weights table — nothing is stored, so nothing can drift.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase Postgres + RLS · `qrcode` (new).

**Spec:** [`docs/superpowers/specs/2026-07-26-phase-4-expansions-design.md`](../specs/2026-07-26-phase-4-expansions-design.md)

## Global Constraints

- **This is not the Next.js in your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing routing or data-fetching code. Heed deprecation notices.
- `middleware.ts` does not exist in Next 16 — the file is `src/proxy.ts` and it exports `proxy`, not `middleware`.
- `params` and `searchParams` are `Promise`s in Next 16 and must be awaited.
- Reads happen in Server Components; writes happen in Server Actions. TanStack Query is only for client-interactive surfaces.
- **The database is the source of truth for access control, not the app.** Every new table gets `alter table … enable row level security`, no exceptions. Every new `SECURITY DEFINER` function gets `set search_path = ''` (which means every reference inside it must be schema-qualified: `public.events`, `extensions.hmac`) and `revoke all … from public, anon` followed by an explicit `grant execute`.
- Existing helpers to reuse, **do not reimplement**: `public.is_approved()`, `public.is_admin()`, `public.is_staff()`, `public.is_super_admin()`, `public.leads_team(uuid)`, `public.event_is_visible(uuid)` — all zero-arg except the last two.
- TypeScript helpers to reuse from `src/lib/auth.ts`: `getCurrentProfile()`, `requireProfile()`, `requireApproved()`, `requireAdmin()`, `requireStaff()`. They `redirect()` on failure, so no null-checking is needed after them.
- pgcrypto **is already installed**, in the `extensions` schema. Call `extensions.hmac(...)`. An unqualified `hmac(...)` fails under `search_path = ''`.
- Supabase project ref: `yhirpgneziptdgrdfjzb`.
- Server actions return a plain state object (`{ error?: string }`), surfaced by the caller with `sonner`'s `toast`. Follow `src/lib/actions/events.ts` exactly.
- Colour tokens: `bg-acm-500` etc. for brand blue, `jasmine` for the warm accent. Fonts: `font-heading` for headings, `font-mono` for data. Never hardcode a hex value.
- After every task: `npx tsc --noEmit`, `npm run lint`, `npm run build` must all pass.

### Two decisions that changed since the spec was written

1. **recharts is cut.** Every metric in this phase is a bar or a single number, and a bar is a `<span>` with a percentage width. Adding a ~500 KB charting library to draw rectangles fails the "native platform feature covers it" test. If a genuine time-series chart is ever needed, add it then.
2. **The new dependency is `qrcode`** (plus `@types/qrcode`), which cannot be replaced by CSS.
3. **Scope narrowed to this phase alone.** Showcase, resource hub, recruitment and bulk tools were cut by decision after the spec was written. Nothing in this plan changes as a result — 4A never depended on them — but `toCsv()` no longer has a second known consumer, and no public or unauthenticated route is being added. Everything stays behind the approval gate.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/*_event_attendance.sql` | Attendance table, RLS, code derivation + check-in functions |
| `supabase/migrations/*_contribution_points.sql` | Weights table, seeds, `member_contributions` view |
| `supabase/tests/05_attendance.sql` | Check-in authorisation and code-window assertions |
| `supabase/tests/06_contributions.sql` | Points arithmetic and weight-edit authorisation |
| `src/lib/csv.ts` | `toCsv()` — RFC 4180 quoting |
| `src/lib/csv.test.ts` | Node built-in test runner check for the quoting rules |
| `src/lib/actions/attendance.ts` | `checkIn`, `getCheckinCode`, `setAttendance` server actions |
| `src/app/(app)/events/[id]/checkin/page.tsx` | The QR target — member confirms presence |
| `src/components/attendance/checkin-form.tsx` | Code entry + confirm button (client) |
| `src/components/admin/checkin-display.tsx` | Rotating QR + 6 digits for the projector (client) |
| `src/components/admin/attendance-roster.tsx` | Manual add/remove override (client) |
| `src/app/(app)/admin/events/[id]/attendance/page.tsx` | Admin console composing the two above |
| `src/app/(app)/leaderboard/page.tsx` | Contribution ranking |
| `src/components/admin/bar-list.tsx` | CSS bar chart, no dependency |
| `src/components/admin/csv-download-button.tsx` | Turns a CSV string into a client-side download |
| `src/app/(app)/admin/analytics/page.tsx` | Charts + export |

---

## Task 1: Get the existing schema into git

The 13 migrations behind Phases 1–3 exist **only in the hosted Supabase project**. Adding two more before pulling them means every future reviewer sees migrations 14 and 15 with no 1–13 to read them against, and there is no rollback. This is a prerequisite, not housekeeping.

**Files:**
- Create: `supabase/migrations/` (13 files, pulled)
- Modify: `.gitignore` if it excludes `supabase/`

- [ ] **Step 1: Link the CLI to the hosted project**

```bash
npx supabase link --project-ref yhirpgneziptdgrdfjzb
```

You will be prompted for the database password. If it is not to hand, reset it at
Supabase Dashboard → Project Settings → Database → Reset database password.

- [ ] **Step 2: Pull the schema**

```bash
npx supabase db pull
```

- [ ] **Step 3: Verify all 13 migrations arrived**

```bash
ls supabase/migrations/
```

Expected: files whose names end in `profiles_and_audit_foundation`, `storage_avatars_bucket`, `harden_definer_functions_and_bucket`, `profiles_is_profile_complete`, `skills_and_member_skills`, `seed_curated_skills`, `events_teams_and_announcements`, `events_teams_rls_and_join_flow`, `allow_trusted_context_profile_writes`, `teams_event_type_default`, `storage_banners_bucket`, `birthday_panel_function`, `fix_join_request_status_cast`.

If `.gitignore` excludes `supabase/`, remove that line — migrations must be tracked.

- [ ] **Step 4: Confirm the local copy matches the remote**

```bash
npx supabase db diff --linked
```

Expected: no differences reported. A non-empty diff means the pull was partial — stop and investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations .gitignore
git commit -m "chore: pull Phase 1-3 schema into the repo"
```

---

## Task 2: Attendance schema and check-in functions

**Files:**
- Create: `supabase/migrations/<timestamp>_event_attendance.sql`
- Create: `supabase/tests/05_attendance.sql`

**Interfaces:**
- Consumes: `public.is_approved()`, `public.is_staff()`, `public.events`, `public.profiles`
- Produces:
  - `public.event_attendance(event_id uuid, member_id uuid, checked_in_at timestamptz, method text, marked_by uuid)`, PK `(event_id, member_id)`
  - `public.event_checkin_code(p_event uuid) returns text` — staff only, current window
  - `public.check_in_to_event(p_event uuid, p_code text) returns void`
  - `public.set_attendance(p_event uuid, p_member uuid, p_present boolean) returns void`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/05_attendance.sql`:

```sql
-- Event check-in.
--
-- event_attendance has NO insert/update/delete policies by design: every write
-- goes through a SECURITY DEFINER function that carries its own authorisation.
-- A direct insert must therefore fail even for a legitimate member.
--
-- Assertions check SPECIFIC error text. A bare "it threw something" assertion
-- passes for the wrong reason -- exactly how the enum-cast bug in
-- respond_to_join_request hid through a whole test run in Phase 2.

do $$
declare
  v_staff uuid; v_member uuid; v_event uuid;
  v_code text; v_stale text; v_err text; v_rows int;
begin
  select id into v_staff  from public.profiles where admin_role is not null limit 1;
  select id into v_member from public.profiles
    where status = 'approved' and id <> v_staff limit 1;

  if v_staff is null or v_member is null then
    raise notice 'skipped: needs two approved profiles';
    return;
  end if;

  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Attendance test', 'open', 4, v_staff) returning id into v_event;

  -- The code is derived, so two different minute windows must differ.
  v_code  := public.event_checkin_code_raw(v_event, 0);
  v_stale := public.event_checkin_code_raw(v_event, -5);
  if v_code is null or length(v_code) <> 6 then
    raise exception 'FAIL: expected a 6-digit code, got %', coalesce(v_code, 'null');
  end if;
  if v_code = v_stale then
    raise exception 'FAIL: the code did not change between minute windows';
  end if;

  -- A stale code is refused.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  begin
    perform public.check_in_to_event(v_event, v_stale);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%not valid right now%' then
    raise exception 'FAIL: a stale code was accepted: %', v_err;
  end if;

  -- The current code works, and repeating it is a no-op rather than an error.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  perform public.check_in_to_event(v_event, v_code);
  perform public.check_in_to_event(v_event, v_code);
  perform set_config('role', 'postgres', true);

  select count(*) into v_rows from public.event_attendance where event_id = v_event;
  if v_rows <> 1 then
    raise exception 'FAIL: expected exactly 1 attendance row, got %', v_rows;
  end if;
  if not exists (
    select 1 from public.event_attendance
    where event_id = v_event and member_id = v_member and method = 'self'
  ) then
    raise exception 'FAIL: the self check-in was not recorded correctly';
  end if;

  delete from public.events where id = v_event;
  raise notice 'ok: stale codes refused, current code accepted, repeat is idempotent';
end $$;

do $$
declare
  v_staff uuid; v_member uuid; v_event uuid; v_code text; v_err text;
begin
  select id into v_staff  from public.profiles where admin_role is not null limit 1;
  select id into v_member from public.profiles
    where status = 'approved' and id <> v_staff limit 1;

  if v_staff is null or v_member is null then
    raise notice 'skipped: needs two approved profiles';
    return;
  end if;

  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Attendance authz test', 'open', 4, v_staff) returning id into v_event;

  -- A member cannot write the table directly, even with a valid code in hand.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  begin
    insert into public.event_attendance (event_id, member_id) values (v_event, v_member);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%row-level security%' then
    raise exception 'FAIL: a direct attendance insert was allowed: %', v_err;
  end if;

  -- A member cannot use the admin override to mark anyone present.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  begin
    perform public.set_attendance(v_event, v_staff, true);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%only staff%' then
    raise exception 'FAIL: a member marked someone else present: %', v_err;
  end if;

  -- Staff override works and is attributed.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform public.set_attendance(v_event, v_member, true);
  perform set_config('role', 'postgres', true);

  if not exists (
    select 1 from public.event_attendance
    where event_id = v_event and member_id = v_member
      and method = 'admin' and marked_by = v_staff
  ) then
    raise exception 'FAIL: the admin override was not recorded or not attributed';
  end if;

  -- Staff can take it back.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  perform public.set_attendance(v_event, v_member, false);
  perform set_config('role', 'postgres', true);

  if exists (select 1 from public.event_attendance
             where event_id = v_event and member_id = v_member) then
    raise exception 'FAIL: the admin override could not be undone';
  end if;

  -- A closed event accepts nobody.
  update public.events set status = 'closed' where id = v_event;
  v_code := public.event_checkin_code_raw(v_event, 0);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  begin
    perform public.check_in_to_event(v_event, v_code);
    v_err := 'NOT BLOCKED';
  exception when others then v_err := SQLERRM;
  end;
  perform set_config('role', 'postgres', true);

  if v_err not like '%not open for check-in%' then
    raise exception 'FAIL: a closed event accepted a check-in: %', v_err;
  end if;

  delete from public.events where id = v_event;
  raise notice 'PASS: attendance writes are function-only, staff-gated and reversible';
end $$;
```

- [ ] **Step 2: Run the test to verify it fails**

Run it in the Supabase SQL editor (Dashboard → SQL Editor → paste → Run).

Expected: `ERROR: function public.event_checkin_code_raw(uuid, integer) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/<timestamp>_event_attendance.sql` (use `npx supabase migration new event_attendance` to get the timestamp):

```sql
-- Event check-in.
--
-- The rotating code is DERIVED, not stored: HMAC(event secret, current minute)
-- truncated to 6 digits. A codes table would need rows inserted, expired and
-- garbage-collected, and two people checking in on the same tick would race for
-- them. Deriving it makes all of that disappear.

alter table public.events
  add column if not exists checkin_secret uuid not null default gen_random_uuid();

create table public.event_attendance (
  event_id      uuid not null references public.events(id)   on delete cascade,
  member_id     uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method        text not null default 'self' check (method in ('self', 'admin')),
  -- null for self check-in; the staff member who did it otherwise
  marked_by     uuid references public.profiles(id) on delete set null,
  -- Composite PK: tapping the button twice is a no-op, not a duplicate row.
  primary key (event_id, member_id)
);

create index event_attendance_member_idx on public.event_attendance (member_id);

alter table public.event_attendance enable row level security;

create policy "approved members read attendance"
  on public.event_attendance for select
  to authenticated
  using ((select public.is_approved()));

-- Deliberately NO insert/update/delete policies. Every write goes through the
-- SECURITY DEFINER functions below, which carry the authorisation themselves.
-- A crafted PostgREST insert therefore has nothing to slip through.

-- Internal. Not callable by any client role -- only by the definer functions
-- below, which run as the owner. This is the ungated version; the staff-facing
-- wrapper is event_checkin_code().
create or replace function public.event_checkin_code_raw(p_event uuid, p_offset int)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lpad((abs(
    ('x' || substr(encode(extensions.hmac(
      (floor(extract(epoch from now()) / 60)::bigint + p_offset)::text,
      e.checkin_secret::text, 'sha256'), 'hex'), 1, 8))::bit(32)::bigint
  ) % 1000000)::text, 6, '0')
  from public.events e
  where e.id = p_event;
$$;

revoke all on function public.event_checkin_code_raw(uuid, int)
  from public, anon, authenticated;

-- What the admin console displays. Returns null rather than raising for
-- non-staff, so a curious member sees an empty panel, not a stack trace.
create or replace function public.event_checkin_code(p_event uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.event_checkin_code_raw(p_event, 0)
  where (select public.is_staff());
$$;

revoke all on function public.event_checkin_code(uuid) from public, anon;
grant execute on function public.event_checkin_code(uuid) to authenticated;

create or replace function public.check_in_to_event(p_event uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'you must be signed in to check in';
  end if;
  if not (select public.is_approved()) then
    raise exception 'only approved members can check in';
  end if;
  if not exists (
    select 1 from public.events where id = p_event and status = 'open'
  ) then
    raise exception 'this event is not open for check-in';
  end if;

  -- Accept the current window and the previous one, so someone typing the code
  -- as the minute rolls over is not punished for being slow.
  if p_code is null or p_code not in (
    public.event_checkin_code_raw(p_event, 0),
    public.event_checkin_code_raw(p_event, -1)
  ) then
    raise exception 'that check-in code is not valid right now';
  end if;

  insert into public.event_attendance (event_id, member_id, method)
  values (p_event, v_me, 'self')
  on conflict (event_id, member_id) do nothing;
end $$;

revoke all on function public.check_in_to_event(uuid, text) from public, anon;
grant execute on function public.check_in_to_event(uuid, text) to authenticated;

-- The override: covers the dead phone, the member at the back of the room, and
-- any dispute. p_present false removes the row.
create or replace function public.set_attendance(
  p_event uuid, p_member uuid, p_present boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if not (select public.is_staff()) then
    raise exception 'only staff can change attendance';
  end if;

  if p_present then
    insert into public.event_attendance (event_id, member_id, method, marked_by)
    values (p_event, p_member, 'admin', v_me)
    on conflict (event_id, member_id) do update
      set method = 'admin', marked_by = v_me, checked_in_at = now();
  else
    delete from public.event_attendance
    where event_id = p_event and member_id = p_member;
  end if;
end $$;

revoke all on function public.set_attendance(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated;
```

- [ ] **Step 4: Apply the migration**

```bash
npx supabase db push
```

- [ ] **Step 5: Run the test to verify it passes**

Re-run `supabase/tests/05_attendance.sql` in the SQL editor.

Expected: two `NOTICE` lines ending in `PASS: attendance writes are function-only, staff-gated and reversible`, and no `ERROR`. Silence on the assertions means every one held.

- [ ] **Step 6: Check the security advisors**

Dashboard → Advisors → Security. Expected: no **new** warnings beyond the pre-existing intentional ones (`is_admin`, `is_approved`, `is_staff`, `is_super_admin`, `leads_team`, `event_is_visible`, `merge_skills`, `respond_to_join_request` being callable by `authenticated`, and the leaked-password toggle). If `event_checkin_code_raw` appears as callable by `authenticated`, the `revoke` did not take — fix it before continuing.

- [ ] **Step 7: Regenerate types**

```bash
npx supabase gen types typescript --project-id yhirpgneziptdgrdfjzb > src/lib/supabase/types.ts
```

Then re-add the hand-written exports at the bottom of the file, which the generator overwrites:

```ts
export type Profile = Tables<"profiles">;
export type Skill = Tables<"skills">;
export type Event = Tables<"events">;
export type Team = Tables<"teams">;
export type JoinRequest = Tables<"join_requests">;
export type Announcement = Tables<"announcements">;
export type EventAttendance = Tables<"event_attendance">;
```

Do **not** strip the `Relationships` arrays from the generated types to save space. PostgREST embed typing (`select("id, teams(id)")`) reads them, and removing them produces `SelectQueryError<"could not find the relation between …">` at build time.

- [ ] **Step 8: Verify and commit**

```bash
npx tsc --noEmit && npm run lint
git add supabase/migrations supabase/tests/05_attendance.sql src/lib/supabase/types.ts
git commit -m "feat: event attendance with derived rotating check-in codes"
```

---

## Task 3: Contribution weights and the points view

**Files:**
- Create: `supabase/migrations/<timestamp>_contribution_points.sql`
- Create: `supabase/tests/06_contributions.sql`

**Interfaces:**
- Consumes: `public.event_attendance` (Task 2), `public.team_members`, `public.teams`, `public.events`, `public.is_approved()`, `public.is_admin()`
- Produces:
  - `public.contribution_weights(action text PK, points int, label text)` — seeded with `event_attended`, `team_joined`, `team_led`, `event_hosted`
  - `public.member_contributions` view: `(member_id uuid, full_name text, photo_url text, branch text, year int, points int)`

**Note on double-counting:** creating a team inserts the lead into `team_members` via a trigger, so a lead scores `team_joined` **and** `team_led` — 15 + 25 = 40. That is intended: leading is strictly more work than joining. It is called out in the migration comment so nobody later "fixes" it.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/06_contributions.sql`:

```sql
-- Contribution points.
--
-- Points are DERIVED by a view, never stored -- same reasoning that removed
-- teams.open_slots. This asserts the arithmetic and that only admins can retune
-- the weights.

do $$
declare
  v_admin uuid; v_member uuid; v_event uuid; v_team uuid;
  v_before int; v_after int; v_w_attend int; v_w_join int; v_err text;
begin
  select id into v_admin  from public.profiles
    where admin_role in ('admin', 'super_admin') limit 1;
  select id into v_member from public.profiles
    where status = 'approved' and id <> v_admin limit 1;

  if v_admin is null or v_member is null then
    raise notice 'skipped: needs an admin and one other approved profile';
    return;
  end if;

  select points into v_w_attend from public.contribution_weights where action = 'event_attended';
  select points into v_w_join   from public.contribution_weights where action = 'team_joined';
  if v_w_attend is null or v_w_join is null then
    raise exception 'FAIL: the contribution weights were not seeded';
  end if;

  select points into v_before from public.member_contributions where member_id = v_member;
  if v_before is null then
    raise exception 'FAIL: an approved member is missing from member_contributions';
  end if;

  insert into public.events (type, title, status, team_max, created_by)
  values ('project', 'Points test', 'open', 4, v_admin) returning id into v_event;

  -- Attending adds exactly one attendance weight.
  insert into public.event_attendance (event_id, member_id) values (v_event, v_member);
  select points into v_after from public.member_contributions where member_id = v_member;
  if v_after <> v_before + v_w_attend then
    raise exception 'FAIL: attending scored %, expected %', v_after - v_before, v_w_attend;
  end if;

  -- Joining a team adds exactly one join weight on top.
  insert into public.teams (event_id, name, lead_id)
  values (v_event, 'Points team', v_admin) returning id into v_team;
  insert into public.team_members (team_id, member_id, event_id)
  values (v_team, v_member, v_event);

  select points into v_after from public.member_contributions where member_id = v_member;
  if v_after <> v_before + v_w_attend + v_w_join then
    raise exception 'FAIL: attend + join scored %, expected %',
      v_after - v_before, v_w_attend + v_w_join;
  end if;

  -- Deleting the event unwinds everything: nothing is stored, so nothing lingers.
  delete from public.events where id = v_event;
  select points into v_after from public.member_contributions where member_id = v_member;
  if v_after <> v_before then
    raise exception 'FAIL: points did not unwind after deletion (% vs %)', v_after, v_before;
  end if;

  raise notice 'ok: points are derived and unwind cleanly';
end $$;

do $$
declare
  v_admin uuid; v_member uuid; v_err text; v_points int;
begin
  select id into v_admin  from public.profiles
    where admin_role in ('admin', 'super_admin') limit 1;
  select id into v_member from public.profiles
    where status = 'approved' and admin_role is null limit 1;

  if v_admin is null or v_member is null then
    raise notice 'skipped: needs an admin and a non-admin approved profile';
    return;
  end if;

  -- A plain member cannot retune the leaderboard in their own favour.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
  update public.contribution_weights set points = 9999 where action = 'event_attended';
  get diagnostics v_points = ROW_COUNT;
  perform set_config('role', 'postgres', true);

  if v_points <> 0 then
    raise exception 'FAIL: a non-admin changed % contribution weight rows', v_points;
  end if;

  -- An admin can.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  update public.contribution_weights set points = 11 where action = 'event_attended';
  get diagnostics v_points = ROW_COUNT;
  perform set_config('role', 'postgres', true);

  if v_points <> 1 then
    raise exception 'FAIL: an admin could not retune the weights';
  end if;

  update public.contribution_weights set points = 10 where action = 'event_attended';
  raise notice 'PASS: weights are admin-only and the view respects RLS';
end $$;
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: `ERROR: relation "public.contribution_weights" does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- Contribution points.
--
-- Derived by a view, never stored. A points column would need every attendance,
-- join, leave, team disband and event deletion to remember to update it, and one
-- that forgets is worse than none -- the same reasoning that removed
-- teams.open_slots in Phase 2.

create table public.contribution_weights (
  action text primary key,
  points int  not null check (points >= 0),
  label  text not null
);

insert into public.contribution_weights (action, points, label) values
  ('event_attended', 10, 'Attended an event'),
  ('team_joined',    15, 'Joined a team'),
  ('team_led',       25, 'Led a team'),
  ('event_hosted',   40, 'Hosted an event');

alter table public.contribution_weights enable row level security;

create policy "approved members read weights"
  on public.contribution_weights for select
  to authenticated
  using ((select public.is_approved()));

create policy "admins retune weights"
  on public.contribution_weights for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- security_invoker: the view runs with the caller's RLS, so a pending member
-- reading it sees what their policies allow and not a definer's-eye view.
create or replace view public.member_contributions
with (security_invoker = true) as
with tally as (
  select a.member_id, 'event_attended'::text as action, count(*)::int as n
    from public.event_attendance a
   group by a.member_id
  union all
  -- Creating a team also inserts the lead into team_members via trigger, so a
  -- lead deliberately scores both team_joined AND team_led. Leading is more
  -- work than joining; this is intended, not a double-count bug.
  select tm.member_id, 'team_joined', count(*)::int
    from public.team_members tm
   group by tm.member_id
  union all
  select t.lead_id, 'team_led', count(*)::int
    from public.teams t
   group by t.lead_id
  union all
  select e.created_by, 'event_hosted', count(*)::int
    from public.events e
   where e.created_by is not null
   group by e.created_by
)
select
  p.id         as member_id,
  p.full_name,
  p.photo_url,
  p.branch,
  p.year,
  coalesce(sum(tally.n * w.points), 0)::int as points
from public.profiles p
left join tally on tally.member_id = p.id
left join public.contribution_weights w on w.action = tally.action
where p.status = 'approved'
group by p.id, p.full_name, p.photo_url, p.branch, p.year;
```

- [ ] **Step 4: Apply and run the test**

```bash
npx supabase db push
```

Then re-run `supabase/tests/06_contributions.sql`.

Expected: `PASS: weights are admin-only and the view respects RLS`, no `ERROR`.

- [ ] **Step 5: Regenerate types and commit**

```bash
npx supabase gen types typescript --project-id yhirpgneziptdgrdfjzb > src/lib/supabase/types.ts
```

Re-add the hand-written exports listed in Task 2 Step 7, then:

```bash
npx tsc --noEmit && npm run lint
git add supabase/migrations supabase/tests/06_contributions.sql src/lib/supabase/types.ts
git commit -m "feat: derived contribution points with admin-tunable weights"
```

---

## Task 4: CSV helper

Built before the page that needs it. A CSV quoter is exactly the kind of code that fails silently — one member with a comma in their name shifts every column in a report that goes to faculty — so it gets the one unit test in this plan.

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`
- Modify: `package.json` (add the `test:unit` script)

**Interfaces:**
- Produces: `toCsv(rows: Record<string, unknown>[], columns?: string[]): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/csv.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.ts";

test("writes a header row and one row per record", () => {
  const csv = toCsv([{ name: "Asha", points: 30 }]);
  assert.equal(csv, "name,points\r\nAsha,30");
});

test("quotes and escapes anything that would break a column", () => {
  const csv = toCsv([
    { name: "Sharma, Priya", note: 'said "hi"' },
    { name: "line\nbreak", note: "" },
  ]);
  assert.equal(
    csv,
    'name,note\r\n"Sharma, Priya","said ""hi"""\r\n"line\nbreak",',
  );
});

test("renders null and undefined as empty, not as the words", () => {
  const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
  assert.equal(csv, "a,b,c\r\n,,0");
});

test("an explicit column list fixes order and drops the rest", () => {
  const csv = toCsv([{ b: 2, a: 1, secret: "x" }], ["a", "b"]);
  assert.equal(csv, "a,b\r\n1,2");
});

test("no rows means no output at all", () => {
  assert.equal(toCsv([]), "");
});
```

- [ ] **Step 2: Add the test script and run it to verify it fails**

Add to the `scripts` block in `package.json`:

```json
"test:unit": "node --experimental-strip-types --test src/**/*.test.ts"
```

Run: `npm run test:unit`

Expected: FAIL — `Cannot find module './csv.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/csv.ts`:

```ts
/**
 * RFC 4180 CSV. Excel and Google Sheets both want CRLF line endings, and both
 * mangle a field containing a comma, a quote or a newline unless it is wrapped
 * in quotes with its own quotes doubled.
 *
 * ponytail: no dependency. This is the whole format that matters for exports;
 * reach for a parser library only if we ever need to *read* CSV.
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);

  const cell = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [
    cols.join(","),
    ...rows.map((row) => cols.map((c) => cell(row[c])).join(",")),
  ].join("\r\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit`

Expected: `# pass 5`, `# fail 0`.

If Node reports that `--experimental-strip-types` is unrecognised, the Node version is below 22.6 — check with `node --version` and upgrade rather than adding a test framework.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts package.json
git commit -m "feat: RFC 4180 CSV helper with quoting tests"
```

---

## Task 5: Check-in server actions and the member check-in page

**Files:**
- Create: `src/lib/actions/attendance.ts`
- Create: `src/app/(app)/events/[id]/checkin/page.tsx`
- Create: `src/components/attendance/checkin-form.tsx`

**Interfaces:**
- Consumes: `requireApproved`, `requireStaff` from `src/lib/auth.ts`; `createClient` from `src/lib/supabase/server.ts`; RPCs `check_in_to_event`, `event_checkin_code`, `set_attendance` from Task 2
- Produces:
  - `type AttendanceState = { error?: string; ok?: boolean }`
  - `checkIn(_prev: AttendanceState, formData: FormData): Promise<AttendanceState>`
  - `getCheckinCode(eventId: string): Promise<string | null>`
  - `setAttendance(formData: FormData): Promise<AttendanceState>`

**Critical:** check-in must be a **POST via a server action**, never a GET side-effect. If visiting the URL checked you in, a link preview, a prefetch or a browser that speculatively loads the page would mark people present who never opened it. The QR opens a page; a button commits.

- [ ] **Step 1: Write the server actions**

Create `src/lib/actions/attendance.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApproved, requireStaff } from "@/lib/auth";

export type AttendanceState = { error?: string; ok?: boolean };

/**
 * The database raises messages already written for members, so they pass
 * through as-is. Anything unrecognised becomes generic rather than leaking a
 * Postgres error to the screen.
 */
const KNOWN = [
  "not valid right now",
  "not open for check-in",
  "only approved members",
  "must be signed in",
];

function friendly(message: string): string {
  const hit = KNOWN.find((k) => message.includes(k));
  return hit ? message.charAt(0).toUpperCase() + message.slice(1) : "That check-in didn't work.";
}

export async function checkIn(
  _prev: AttendanceState,
  formData: FormData,
): Promise<AttendanceState> {
  await requireApproved();

  const eventId = String(formData.get("event_id") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!eventId) return { error: "Missing event." };
  if (code.length !== 6) return { error: "Check-in codes are six digits." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_to_event", {
    p_event: eventId,
    p_code: code,
  });
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}

/** Polled by the admin console so the projected code stays current. */
export async function getCheckinCode(eventId: string): Promise<string | null> {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_checkin_code", { p_event: eventId });
  return data ?? null;
}

/** The override: add or remove one member from the roster by hand. */
export async function setAttendance(formData: FormData): Promise<AttendanceState> {
  await requireStaff();

  const eventId = String(formData.get("event_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const present = formData.get("present") === "true";
  if (!eventId || !memberId) return { error: "Missing event or member." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_attendance", {
    p_event: eventId,
    p_member: memberId,
    p_present: present,
  });
  if (error) return { error: "That attendance change didn't save." };

  revalidatePath(`/admin/events/${eventId}/attendance`);
  revalidatePath("/leaderboard");
  return { ok: true };
}
```

- [ ] **Step 2: Write the check-in form**

Create `src/components/attendance/checkin-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { checkIn, type AttendanceState } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The code arrives prefilled when the member scanned the QR, and empty when
 * they are typing what is on the projector. Same form either way.
 */
export function CheckinForm({
  eventId,
  presetCode,
}: {
  eventId: string;
  presetCode?: string;
}) {
  const [state, formAction, pending] = useActionState<AttendanceState, FormData>(
    checkIn,
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success("You're checked in.");
    if (state.error) toast.error(state.error);
  }, [state]);

  if (state.ok) {
    return (
      <p className="rounded-2xl border bg-jasmine-soft/40 px-5 py-4 text-sm dark:bg-transparent">
        You&apos;re checked in. Your contribution points update straight away.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="event_id" value={eventId} />

      <div className="space-y-2">
        <Label htmlFor="code">Check-in code</Label>
        <Input
          id="code"
          name="code"
          defaultValue={presetCode ?? ""}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="max-w-40 text-center font-mono text-2xl tracking-[0.3em]"
        />
        <p className="text-sm text-muted-foreground">
          Six digits from the screen at the venue. It changes every minute.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Checking in…" : "Check in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/(app)/events/[id]/checkin/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckinForm } from "@/components/attendance/checkin-form";

export const metadata: Metadata = { title: "Check in" };

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const profile = await requireApproved();
  const { id } = await params;
  const { c } = await searchParams;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const { data: already } = await supabase
    .from("event_attendance")
    .select("checked_in_at")
    .eq("event_id", id)
    .eq("member_id", profile.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-md">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-acm-600 dark:text-acm-300">
        Check in
      </p>
      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight">{event.title}</h1>

      <div className="mt-8">
        {already ? (
          <p className="rounded-2xl border bg-jasmine-soft/40 px-5 py-4 text-sm dark:bg-transparent">
            You checked in already. Nothing else to do.
          </p>
        ) : event.status !== "open" ? (
          <p className="rounded-2xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
            This event isn&apos;t open for check-in.
          </p>
        ) : (
          <CheckinForm eventId={event.id} presetCode={c} />
        )}
      </div>

      <Link
        href={`/events/${event.id}`}
        className="mt-6 inline-block text-sm text-muted-foreground hover:underline"
      >
        Back to the event
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles and renders**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Then with `npm run dev` running, sign in as the super admin, create an open event in `/admin/events/new`, and open `/events/<id>/checkin`. Expected: the six-digit input renders and submitting a wrong code shows the toast "That check-in code is not valid right now."

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/attendance.ts src/components/attendance src/app/"(app)"/events
git commit -m "feat: member check-in page and attendance actions"
```

---

## Task 6: Admin attendance console

**Files:**
- Create: `src/components/admin/checkin-display.tsx`
- Create: `src/components/admin/attendance-roster.tsx`
- Create: `src/app/(app)/admin/events/[id]/attendance/page.tsx`
- Modify: `package.json` (add `qrcode`, `@types/qrcode`)

**Interfaces:**
- Consumes: `getCheckinCode`, `setAttendance` from Task 5
- Produces: nothing other tasks depend on

- [ ] **Step 1: Install the QR generator**

```bash
npm install qrcode && npm install -D @types/qrcode
```

This is the phase's only new runtime dependency. It renders client-side to a data URI — no network call, no external QR service.

- [ ] **Step 2: Write the rotating display**

Create `src/components/admin/checkin-display.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getCheckinCode } from "@/lib/actions/attendance";

/**
 * What goes on the projector. The QR encodes a URL, not a payload, so members
 * scan it with their phone's native camera app and land on a page where they
 * are already signed in -- no scanner library, no camera permission prompt, and
 * it works on iOS Safari where BarcodeDetector does not exist.
 *
 * Polls every 15s against a 60s code window, so the projected code is never
 * more than a quarter of a window stale.
 */
export function CheckinDisplay({ eventId }: { eventId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await getCheckinCode(eventId);
      if (!cancelled) setCode(next);
    };
    tick();
    const timer = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId]);

  useEffect(() => {
    if (!code) return;
    const url = `${window.location.origin}/events/${eventId}/checkin?c=${code}`;
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [code, eventId]);

  return (
    <div className="rounded-2xl border p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Scan or type
      </p>

      <div className="mt-5 flex justify-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URI, nothing for the image optimiser to do
          <img src={qr} alt="Check-in QR code" className="size-56 rounded-xl border bg-white p-2" />
        ) : (
          <div className="size-56 animate-pulse rounded-xl border bg-muted" />
        )}
      </div>

      <p className="mt-5 font-mono text-5xl font-bold tracking-[0.2em] tabular-nums">
        {code ?? "······"}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Changes every minute. The previous code keeps working for one more minute.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Write the roster override**

Create `src/components/admin/attendance-roster.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setAttendance } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type RosterMember = {
  id: string;
  full_name: string;
  branch: string | null;
  present: boolean;
};

/** The override, for the dead phone and the member at the back of the room. */
export function AttendanceRoster({
  eventId,
  members,
}: {
  eventId: string;
  members: RosterMember[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const shown = members.filter((m) =>
    m.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (member: RosterMember) => {
    const data = new FormData();
    data.set("event_id", eventId);
    data.set("member_id", member.id);
    data.set("present", String(!member.present));
    startTransition(async () => {
      const result = await setAttendance(data);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(
          member.present
            ? `${member.full_name} marked absent.`
            : `${member.full_name} marked present.`,
        );
      }
    });
  };

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members"
        aria-label="Search members"
        className="max-w-sm"
      />

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nobody matches that.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-2xl border">
          {shown.map((member) => (
            <li key={member.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.full_name}</p>
                {member.branch && (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {member.branch}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={member.present ? "default" : "outline"}
                className={member.present ? "bg-acm-500" : ""}
                disabled={pending}
                onClick={() => toggle(member)}
              >
                {member.present ? "Present" : "Mark present"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the console page**

Create `src/app/(app)/admin/events/[id]/attendance/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckinDisplay } from "@/components/admin/checkin-display";
import { AttendanceRoster, type RosterMember } from "@/components/admin/attendance-roster";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const [{ data: members }, { data: attendance }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, branch")
      .eq("status", "approved")
      .order("full_name"),
    supabase.from("event_attendance").select("member_id").eq("event_id", id),
  ]);

  const present = new Set((attendance ?? []).map((a) => a.member_id));
  const roster: RosterMember[] = (members ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    branch: m.branch,
    present: present.has(m.id),
  }));

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{event.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {present.size} of {roster.length} approved members checked in.
        </p>
      </div>

      {event.status !== "open" ? (
        <p className="mt-8 rounded-2xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
          Check-in codes only work while the event is open. Reopen it from the events list
          to run check-in.
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[24rem_1fr]">
          <CheckinDisplay eventId={event.id} />
          <AttendanceRoster eventId={event.id} members={roster} />
        </div>
      )}

      {event.status !== "open" && (
        <div className="mt-8">
          <AttendanceRoster eventId={event.id} members={roster} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

With `npm run dev`, open `/admin/events/<id>/attendance` for an **open** event. Expected: a QR renders, six digits show beneath it, and the digits change within 60 seconds. Scan the QR with a phone camera on the same network — it should open the check-in page with the code prefilled. Toggling "Mark present" should flip the button and update the count on reload.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/admin src/app/"(app)"/admin
git commit -m "feat: admin check-in console with rotating QR and roster override"
```

---

## Task 7: Leaderboard page

**Files:**
- Create: `src/app/(app)/leaderboard/page.tsx`
- Modify: `src/app/(app)/layout.tsx:24-27` (nav links array)

**Interfaces:**
- Consumes: `public.member_contributions` view (Task 3), `requireApproved`

- [ ] **Step 1: Write the page**

Create `src/app/(app)/leaderboard/page.tsx`:

```tsx
import type { Metadata } from "next";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();

export default async function LeaderboardPage() {
  const me = await requireApproved();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("member_contributions")
    .select("member_id, full_name, photo_url, branch, points")
    .order("points", { ascending: false })
    .order("full_name");

  const ranked = (rows ?? []).map((row, i) => ({ ...row, rank: i + 1 }));
  const mine = ranked.find((r) => r.member_id === me.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mt-2 text-muted-foreground">
        Points come from turning up and building things — attending events, joining teams,
        leading them, hosting them.
      </p>

      {mine && (
        <p className="mt-6 rounded-2xl border bg-jasmine-soft/40 px-5 py-4 text-sm dark:bg-transparent">
          You&apos;re <span className="font-mono font-semibold">#{mine.rank}</span> with{" "}
          <span className="font-mono font-semibold">{mine.points}</span> points.
        </p>
      )}

      {ranked.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
          <p className="font-heading text-lg font-semibold">Nothing to rank yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Points appear once members start attending events and joining teams.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y rounded-2xl border">
          {ranked.map((row) => (
            <li
              key={row.member_id}
              className={cn(
                "flex items-center gap-4 px-5 py-3",
                row.member_id === me.id && "bg-acm-50/60 dark:bg-acm-950/30",
              )}
            >
              <span className="w-8 shrink-0 font-mono text-sm text-muted-foreground">
                {String(row.rank).padStart(2, "0")}
              </span>

              <Avatar className="size-9">
                <AvatarImage src={row.photo_url ?? undefined} alt="" />
                <AvatarFallback>{initials(row.full_name ?? "?")}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.full_name}</p>
                {row.branch && (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {row.branch}
                  </p>
                )}
              </div>

              <span className="font-mono text-sm font-semibold tabular-nums">
                {row.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add it to the member nav**

In `src/app/(app)/layout.tsx`, the `links` array currently reads:

```tsx
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/events", label: "Events" },
    { href: "/directory", label: "Directory" },
```

Add one entry after Directory:

```tsx
    { href: "/leaderboard", label: "Leaderboard" },
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

With `npm run dev`, open `/leaderboard`. Expected: your own row is highlighted, the "You're #N" banner shows, and points match what the earlier check-in awarded.

If `member_contributions` produces a TypeScript error, the types were not regenerated after Task 3 — rerun the `gen types` command from Task 3 Step 5.

- [ ] **Step 4: Commit**

```bash
git add src/app/"(app)"/leaderboard src/app/"(app)"/layout.tsx
git commit -m "feat: contribution leaderboard"
```

---

## Task 8: Analytics dashboard with CSV export

**Files:**
- Create: `src/components/admin/bar-list.tsx`
- Create: `src/components/admin/csv-download-button.tsx`
- Create: `src/app/(app)/admin/analytics/page.tsx`
- Modify: `src/app/(app)/admin/layout.tsx:4-13` (`SECTIONS` array)

**Interfaces:**
- Consumes: `toCsv` (Task 4), `member_contributions` (Task 3), `event_attendance` (Task 2), `requireStaff`
- Produces: `BarList({ items }: { items: { label: string; value: number }[] })`

- [ ] **Step 1: Write the bar chart**

Create `src/components/admin/bar-list.tsx`:

```tsx
/**
 * ponytail: a bar chart is a div with a percentage width. Every metric on this
 * dashboard is a bar or a single number, so a ~500 KB charting library would be
 * paying a bundle for rectangles. Add one only when a real time series appears.
 */
export function BarList({
  items,
  empty = "No data yet.",
}: {
  items: { label: string; value: number }[];
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="grid grid-cols-[minmax(6rem,10rem)_1fr_2.5rem] items-center gap-3 text-sm"
        >
          <span className="truncate" title={item.label}>
            {item.label}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-acm-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-mono text-xs tabular-nums">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Write the download button**

Create `src/components/admin/csv-download-button.tsx`:

```tsx
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The CSV is built on the server and passed in as a string, so this only has to
 * hand it to the browser. A Blob URL avoids the length cap that a data: URI hits
 * on a chapter-sized export.
 */
export function CsvDownloadButton({
  csv,
  filename,
  children,
}: {
  csv: string;
  filename: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={csv === ""}
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="size-4" aria-hidden />
      {children}
    </Button>
  );
}
```

- [ ] **Step 3: Write the analytics page**

Create `src/app/(app)/admin/analytics/page.tsx`:

```tsx
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { BarList } from "@/components/admin/bar-list";
import { CsvDownloadButton } from "@/components/admin/csv-download-button";
import { YEARS } from "@/lib/constants";

export const metadata: Metadata = { title: "Analytics" };

/** Counts occurrences of a key, dropping nulls, sorted biggest first. */
function tally<T>(rows: T[], key: (row: T) => string | null): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export default async function AnalyticsPage() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: members }, { data: events }, { data: attendance }, { data: skills }, { data: points }] =
    await Promise.all([
      supabase.from("profiles").select("id, branch, year").eq("status", "approved"),
      supabase.from("events").select("id, title, status, team_max, teams(id, team_members(member_id))"),
      supabase.from("event_attendance").select("event_id"),
      supabase.from("member_skills").select("skills(name)"),
      supabase
        .from("member_contributions")
        .select("full_name, branch, year, points")
        .order("points", { ascending: false }),
    ]);

  const approved = members ?? [];
  const attendanceByEvent = new Map<string, number>();
  for (const row of attendance ?? []) {
    attendanceByEvent.set(row.event_id, (attendanceByEvent.get(row.event_id) ?? 0) + 1);
  }

  const participation = (events ?? [])
    .filter((e) => e.status !== "draft")
    .map((e) => ({
      label: e.title,
      value: approved.length
        ? Math.round(((attendanceByEvent.get(e.id) ?? 0) / approved.length) * 100)
        : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const branches = tally(approved, (m) => m.branch);
  const years = tally(approved, (m) =>
    m.year ? (YEARS.find((y) => y.value === m.year)?.label ?? `Year ${m.year}`) : null,
  );
  const topSkills = tally(skills ?? [], (s) => s.skills?.name ?? null).slice(0, 12);

  const fillRates = (events ?? [])
    .filter((e) => e.teams.length > 0)
    .map((e) => ({
      label: e.title,
      value: Math.round(
        (e.teams.reduce((sum, t) => sum + t.team_members.length, 0) /
          (e.teams.length * Math.max(1, e.team_max))) *
          100,
      ),
    }))
    .sort((a, b) => b.value - a.value);

  const csv = toCsv(
    (points ?? []).map((p) => ({
      name: p.full_name,
      branch: p.branch,
      year: p.year,
      points: p.points,
    })),
    ["name", "branch", "year", "points"],
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            {approved.length} approved members across {(events ?? []).length} events.
          </p>
        </div>
        <CsvDownloadButton csv={csv} filename="acm-contributions.csv">
          Export contributions
        </CsvDownloadButton>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border p-5">
          <h2 className="font-heading font-semibold">Participation rate</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Percent of approved members who checked in.
          </p>
          <BarList items={participation} empty="No events have run check-in yet." />
        </section>

        <section className="rounded-2xl border p-5">
          <h2 className="font-heading font-semibold">Team fill rate</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Percent of available team seats taken.
          </p>
          <BarList items={fillRates} empty="No teams have formed yet." />
        </section>

        <section className="rounded-2xl border p-5">
          <h2 className="font-heading font-semibold">Branch distribution</h2>
          <div className="mt-4">
            <BarList items={branches} />
          </div>
        </section>

        <section className="rounded-2xl border p-5">
          <h2 className="font-heading font-semibold">Year distribution</h2>
          <div className="mt-4">
            <BarList items={years} />
          </div>
        </section>

        <section className="rounded-2xl border p-5 lg:col-span-2">
          <h2 className="font-heading font-semibold">Top skills in the chapter</h2>
          <div className="mt-4">
            <BarList items={topSkills} empty="Nobody has added skills yet." />
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add it to the admin nav**

In `src/app/(app)/admin/layout.tsx`, add one entry to `SECTIONS` after Members:

```tsx
  { href: "/admin/analytics", label: "Analytics" },
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:unit
```

With `npm run dev`, open `/admin/analytics`. Expected: five panels render, bars are proportional, and "Export contributions" downloads a CSV that opens in a spreadsheet with four correctly aligned columns.

If the `skills(name)` embed produces a `SelectQueryError`, the `Relationships` arrays were stripped from the generated types — regenerate them per Task 2 Step 7.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin src/app/"(app)"/admin
git commit -m "feat: analytics dashboard with CSS bars and CSV export"
```

---

## Task 9: Wire attendance into the event pages and close out

**Files:**
- Modify: `src/app/(app)/admin/events/page.tsx:46-73` (add an attendance link per row)
- Modify: `README.md`

- [ ] **Step 1: Link to the attendance console from the events list**

In `src/app/(app)/admin/events/page.tsx`, inside the `<li>` and immediately before `<EventStatusControl … />`, add:

```tsx
              <Link
                href={`/admin/events/${event.id}/attendance`}
                className="font-mono text-xs text-acm-600 hover:underline dark:text-acm-300"
              >
                Attendance
              </Link>
```

`Link` is already imported at the top of that file.

- [ ] **Step 2: Document the new rules in the README**

In `README.md`, add two rows to the tests table:

```markdown
| `05_attendance.sql` | Stale codes refused, repeat check-in idempotent, writes are function-only, staff override reversible |
| `06_contributions.sql` | Points arithmetic, weights are admin-only, deletion unwinds cleanly |
```

And add to the "The rules that live in Postgres" list:

```markdown
- **Check-in codes are derived, not stored** — `HMAC(event secret, current minute)`
  truncated to six digits, with the previous window still accepted. No code table
  to expire, and no race between simultaneous check-ins.
- **Contribution points are derived** — a view over attendance, teams and events
  joined against an editable weights table, so a retune is an `UPDATE` and not a
  migration.
```

- [ ] **Step 3: Full verification sweep**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:unit
```

Re-run `supabase/tests/05_attendance.sql` and `06_contributions.sql` in the SQL editor. Expected: `PASS` notices from both, no `ERROR`.

Check Dashboard → Advisors → Security for new warnings.

- [ ] **Step 4: End-to-end walkthrough**

With two accounts (the super admin and one approved member):

1. Admin hosts an event and sets it to **open**.
2. Admin opens `/admin/events/<id>/attendance` — QR and six digits render.
3. Member scans the QR with a phone camera, lands on the check-in page with the code prefilled, taps **Check in**.
4. Admin's roster shows them present after a reload; the count increments.
5. `/leaderboard` shows the member with the `event_attended` weight.
6. `/admin/analytics` shows a non-zero participation bar for that event.
7. Admin toggles the member to absent; the leaderboard drops back.

- [ ] **Step 5: Commit**

```bash
git add src/app/"(app)"/admin/events/page.tsx README.md
git commit -m "docs: record attendance and contribution rules; link the check-in console"
```

---

## Self-Review

**Spec coverage.** Every 4A requirement maps to a task: rotating code and QR-as-URL → Task 2 and 6; `event_attendance` with the composite PK → Task 2; derived points with a weights table → Task 3; participation rate, branch/year distribution, skill coverage, team fill rate → Task 8; CSV export via a shared helper → Tasks 4 and 8; leaderboard → Task 7; `05_attendance.sql` and the new `06_contributions.sql` → Tasks 2 and 3. Task 1 is a prerequisite the spec listed under 4D but which cannot wait, since writing migrations 14 and 15 into a repo with no 1–13 leaves them unreviewable.

**Deviations from the spec, both deliberate:** recharts is cut in favour of CSS bars, and pulling the existing migrations into git is promoted from 4D to Task 1.

**Naming consistency.** `event_checkin_code_raw` (internal, ungated) and `event_checkin_code` (staff wrapper) are distinct on purpose and used consistently — the raw form appears only inside `check_in_to_event` and the SQL tests, the wrapper only in `getCheckinCode`. `set_attendance` is the RPC, `setAttendance` the server action. `AttendanceState` is the single action-state type across all three actions. `toCsv` is defined in Task 4 and consumed in Task 8 with the same signature. `BarList` takes `{ label, value }[]` everywhere.

**Not covered by automated tests:** page rendering. This codebase has no browser test runner, and Phases 1–3 verified UI by manual walkthrough with SQL tests carrying the business rules. Task 9 Step 4 continues that convention rather than introducing a framework mid-project.
