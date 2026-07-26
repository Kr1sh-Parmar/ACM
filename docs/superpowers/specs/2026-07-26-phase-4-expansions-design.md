# Phase 4 Expansions — Design

**Date:** 2026-07-26
**Status:** Approved, not yet planned
**Predecessor:** Phases 1–3 (profiles + approval gate, skills directory, event hosting, team formation, admin dashboard) — code-complete, database rules tested in `supabase/tests/01`–`04`.

---

## Context

The chapter app currently does three things: it gates membership behind manual admin
approval, it lets members advertise skills and find each other, and it runs
hackathon/project team formation. Section 6 of
[`context/ACM_Committee_Management_System_Spec.md`](../../../context/ACM_Committee_Management_System_Spec.md)
lists eight suggested expansions. This spec covers the three that were selected,
grouped by the data they share rather than by the order the spec lists them.

**A caveat recorded deliberately:** the app has not been deployed and no committee
member has used it. Choosing expansions without usage data is guesswork, and that
was raised before scoping. The decision was to build features now and ship
afterwards, so Phase 4D exists to close that gap rather than leaving it implicit.

### Decisions

| Decision | Choice |
|---|---|
| Scope | Participation & analytics · Showcase & resource hub · Recruitment & bulk tools |
| Dropped | Mentorship/buddy system · feedback & polls |
| Public surface | `/showcase` only. Recruitment reuses the existing signup → pending pipeline |
| Check-in trust | Self-service rotating code, plus admin override |
| Order | 4A → 4B → 4C → 4D |

### Why mentorship and feedback were cut

Both depend on sustained opt-in from people who are not yet using the tool at all,
and neither shares code with anything that exists. They are additive later; nothing
in this spec forecloses them.

---

## Phase 4A — Participation & Analytics

Answers "who is actually active", which is what Core promotions currently guess at.

### Check-in without a codes table

The rotating code is **derived, not stored**:

```sql
-- code = HMAC(event secret, current minute), truncated to 6 digits
create or replace function public.event_checkin_code(p_event uuid, p_offset int default 0)
returns text language sql stable security definer set search_path = '' as $$
  select lpad((abs(
    ('x' || substr(encode(extensions.hmac(
      (floor(extract(epoch from now()) / 60)::bigint + p_offset)::text,
      e.checkin_secret::text, 'sha256'), 'hex'), 1, 8))::bit(32)::bigint
  ) % 1000000)::text, 6, '0')
  from public.events e where e.id = p_event;
$$;
```

`events` gains `checkin_secret uuid not null default gen_random_uuid()`, readable only
by staff.

Consequences of deriving rather than storing:

- No code rows to insert, expire, or garbage-collect.
- No race when two people check in on the same tick.
- Verification accepts offset `0` and `-1`, so a member typing as the minute rolls
  over is not rejected.

**pgcrypto gotcha:** Supabase ships pgcrypto but installs it into the `extensions`
schema, so `hmac` must be called as `extensions.hmac` — an unqualified call fails
under `search_path = ''`. Verify the extension is enabled before writing the migration.

### The QR encodes a URL, not a payload

The admin's projected QR points at `…/events/[id]/checkin?c=123456`. Members scan it
with their **phone's native camera app**, which opens the URL in a browser where they
are already signed in; one tap confirms.

This means the app needs a QR *generator* and never a *scanner*. No camera-permission
prompt, no barcode library, and it sidesteps `BarcodeDetector` being absent on iOS
Safari. The same code renders as six digits beside the QR, so a bad projector or a
member at the back of the room still has a path.

### Schema

```
event_attendance
  event_id     FK -> events
  member_id    FK -> profiles
  checked_in_at timestamptz default now()
  method       self | admin
  marked_by    FK -> profiles   -- null when self-serve
  PRIMARY KEY (event_id, member_id)
```

The composite primary key makes a double check-in a no-op rather than an error — the
member taps twice, nothing breaks, no duplicate row.

### Contribution points are derived, never stored

Same reasoning that removed `teams.open_slots` in Phase 2: a stored counter needs
every write path to remember to update it, and one that forgets is worse than none.

```
contribution_weights   action text PK, points int   -- 4 seeded rows, admin-editable
member_contributions   VIEW: sums attendance, team memberships, team leads,
                       events created — joined against contribution_weights
```

Retuning the leaderboard is an `UPDATE` on four rows, not a migration. Nothing
recomputes and nothing drifts.

### Analytics

Reads `member_contributions` plus existing tables. No new storage.

- Participation rate per event (attended ÷ approved members)
- Branch and year distribution
- Skill coverage across the chapter
- Team formation: teams per event, average fill rate
- CSV export for IIC/faculty reports

Charts use shadcn's own chart component (recharts) — the one new dependency in this
spec. CSV export goes through a single `toCsv()` helper in `src/lib/`; Phase 4C
reuses it rather than growing a second exporter.

### Routes

```
/leaderboard                        approved members
/events/[id]/checkin                approved members — the QR target
/admin/events/[id]/attendance       staff: live count, manual add/remove
/admin/analytics                    staff: charts + CSV export
```

---

## Phase 4B — Showcase & Resource Hub

**This phase carries the only real security risk in the plan.** Every route today sits
behind the approval gate. `/showcase` is the first hole in it, and one careless policy
publishes the member directory to the internet.

### The specific hazard

A showcase entry credits its contributors, so the public page needs member names and
photos — but `profiles` must stay completely closed to `anon`. Granting `anon` a
filtered `SELECT` on `profiles` is the tempting shortcut and the wrong one: policy
predicates are easy to get subtly wrong, and the blast radius is the whole directory.

Instead, contributors reach the public page through a **narrow view** exposing only
`full_name`, `photo_url` and `designation`, and only for members credited on a
`published` project. `anon` never touches `profiles` directly.

### Schema

```
showcase_projects
  id, title, summary, description, cover_url, repo_url, demo_url
  event_id      FK -> events, nullable   -- "born from this hackathon"
  status        draft | submitted | published
  submitted_by  FK -> profiles
  published_at  timestamptz

showcase_contributors   project_id, member_id, role
showcase_tech           project_id, skill_id      -- reuses the existing skill tags

resources
  id, title, url, kind (link|recording|template|doc),
  description, category, created_by, created_at
```

**Naming:** `events.type` already has a `'project'` value. The table is
`showcase_projects`, never `projects`, and the distinction gets a comment in the
migration.

Reusing `skills` for tech stack means a showcase entry's stack is the same vocabulary
as member skills — so "who has shipped something in Rust" becomes answerable without
new tagging.

### Flow and access

Members submit (`draft` → `submitted`), admins publish (`submitted` → `published`).
Same mental model as the approval queue, so the admin UI reuses that shape.

`/showcase` and `/showcase/[id]` live outside the `(app)` route group and are
exempted in `src/proxy.ts`. The proxy exemption is a UX convenience; the RLS policies
are the enforcement, and both are tested.

The resource hub is deliberately small: an admin-curated list of links with a category
filter. No uploads, no versioning, no per-member collections.

### Routes

```
/showcase, /showcase/[id]      public, no login
/showcase/submit               approved members
/resources                     approved members
/admin/showcase                staff: publish queue
/admin/resources               staff: curate
```

---

## Phase 4C — Recruitment & Bulk Tools

The smallest phase, because routing recruitment through signup made it mostly reuse.
An applicant **is** a pending profile — signup → pending → admin review already
exists and is already tested. Recruitment mode layers cycle-specific answers,
interview slots and reviewer notes on top of it.

### Schema

```
recruitment_cycles   title, opens_at, closes_at, status (draft|open|closed),
                     questions jsonb
applications         cycle_id, profile_id, answers jsonb, status
                     UNIQUE (cycle_id, profile_id)
interview_slots      cycle_id, starts_at, interviewer_id,
                     applicant_id nullable
                     UNIQUE (applicant_id, cycle_id) where applicant_id is not null
reviewer_notes       application_id, reviewer_id, note, rating, created_at
```

### Two deliberate cuts

**No form builder.** `questions` is a flat array of `{label, type}` where type is
text, textarea or select. Admins edit it as a repeatable field list. A drag-and-drop
builder is a project in its own right and upgrades later without a schema change,
since the column is already `jsonb`.

**No scheduling engine.** Admins create slots with `<input type="datetime-local">`;
applicants claim one from a list; a taken slot is a unique constraint, not a conflict
resolver. No calendar grid, no timezone arithmetic, no availability matching.

**Segmented email is cut entirely.** Outbound email was declined in Phase 1 and
Supabase's built-in mailer caps at roughly 2/hour, so shipping it would produce a
feature that silently fails under exactly the load it exists for.

### Bulk tools

A checkbox column on the existing approvals queue with approve/reject-selected, plus
CSV export through Phase 4A's `toCsv()` helper. Bulk actions route through the same
`reviewMember` server action per row, so the audit log records each decision
individually — a bulk approval that writes one audit row for forty people is not an
audit log.

### Routes

```
/apply                          signed-in applicants: fill the open cycle's form
/apply/interview                claim a slot
/admin/recruitment              staff: cycles, applications, notes
/admin/recruitment/[cycleId]    review pipeline
```

---

## Phase 4D — Ship It

Deferred from the sequencing decision, not dropped:

1. `npx supabase link && npx supabase db pull` — the schema currently exists only in
   the hosted project, which means there is no rollback and no review of migrations.
2. First real commit of the application code.
3. Vercel deploy.
4. Two dashboard toggles that the API cannot set: **Confirm email → OFF** (admin
   approval is the gate, and the mailer cap breaks batch signups) and **Leaked
   password protection → ON**.
5. The full authenticated walkthrough, which has never been run in a browser.

---

## Verification

Three new SQL test files continuing `supabase/tests/01`–`04`, asserting against the
database rather than the UI, because the database is what enforces these rules.

| File | Asserts |
|---|---|
| `05_attendance.sql` | Stale code rejected; current code accepted; repeat check-in is idempotent; a member cannot mark someone else present; admin override lands and is attributed |
| `06_showcase_public.sql` | **`anon` reads published projects and nothing else** — zero rows from `profiles`, `events`, `teams`, `member_skills`; draft and submitted projects invisible; the contributor view leaks no column beyond name/photo/designation |
| `07_recruitment.sql` | Applicants read only their own application; reviewer notes are staff-only; slot double-booking rejected; a closed cycle accepts nothing |

`06` is the one that matters most, and it should assert on **specific** error text and
row counts. A bare "it returned nothing" assertion can pass for the wrong reason —
that is exactly how the enum-cast bug in `respond_to_join_request` hid through an
entire test run in Phase 2.

Every new `SECURITY DEFINER` function gets the same treatment as the existing ones:
`search_path` pinned to `''`, execute revoked from `public`, granted only where needed.
Every new table has RLS enabled with no exceptions.

Beyond SQL: `npm run build`, `npm run lint` and `tsc` green at the end of each phase,
and each phase ends in a state that can be opened in a browser and checked.

---

## Out of Scope

Mentorship/buddy system · feedback forms and interest polls · segmented email ·
drag-and-drop form builder · interview scheduling with conflict resolution · file
uploads in the resource hub · public write access of any kind · alumni roles · peer
endorsements.

All are additive. None require changing the schema above.

---

## Open Items

- Confirm pgcrypto is enabled and note its schema before writing the 4A migration.
- Chapter-specific lists (branches, designations) are still placeholders in
  `src/lib/constants.ts`; contribution weight defaults will seed alongside them and
  need the same review.
