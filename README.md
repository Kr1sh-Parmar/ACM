# ACM Committee Management System

Internal web app for the ACM student chapter committee: member profiles behind an
admin approval gate, a searchable skill directory, and hackathon/project team
formation.

Full requirements live in [`context/ACM_Committee_Management_System_Spec.md`](context/ACM_Committee_Management_System_Spec.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage, Realtime) · Motion · deployed on Vercel.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Required Supabase dashboard settings

Two things the API can't set and the app depends on:

1. **Authentication → Sign In / Providers → Email → "Confirm email": OFF.**
   Admin approval is the gate, so email confirmation is redundant — and
   Supabase's built-in mailer is capped at roughly 2 emails/hour, which would
   break signups the moment a batch of members registers. With it on, signup
   stops at a "confirm your email" screen.
2. **Authentication → Policies → "Leaked password protection": ON.**
   Checks new passwords against HaveIBeenPwned.

## Appointing the first super admin

The person who runs the chapter has no admin above them to approve the promotion,
so the first one is set directly in SQL. Sign up through the app first, then run
this in the Supabase SQL editor:

```sql
update public.profiles
set admin_role = 'super_admin', status = 'approved'
where email = 'you@example.com';
```

This works because `guard_profile_privileged_columns` deliberately allows writes
when `auth.uid()` is null — i.e. from a trusted SQL session or the service role.
Members always carry a `sub` claim, so they can never reach that path. Every
later admin is promoted from **Admin → Members** in the UI.

## Schema

The database is the source of truth for access control, not the app. All
migrations are tracked in `supabase/migrations/`, in the order they were
applied. To apply them to a fresh project:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Each file is named `<timestamp>_<name>.sql` and matches the hosted project's
migration history exactly. Two of them exist only to fix an earlier one
(`fix_join_request_status_cast`, `upcoming_birthdays_without_photo_url`) —
they are kept rather than squashed, because the history is the record of what
the live database actually ran.

### The rules that live in Postgres

- **Approval gate** — RLS on every table. A `pending` member can read their own
  profile row and nothing else. Not a UI check: the proxy redirect is a
  convenience, RLS is the enforcement.
- **One team per hackathon, unlimited per project** — a partial unique index
  (`one_team_per_hackathon`) over a denormalised `event_type` that composite
  foreign keys keep in sync with `events.type`. Declarative, so it holds under
  concurrent join approvals.
- **Privilege escalation** — a trigger blocks members from editing their own
  `status` or `admin_role`; only super admins change roles.
- **Audit log** — written by one trigger attached to `profiles`, `events` and
  `announcements`, so no new code path can forget to log.
- **Open slots** are always derived (`team_max` − roster), never stored, so the
  count can't drift.

## Tests

`supabase/tests/*.sql` assert the rules above directly against the database —
the layer that actually enforces them. Run them in the SQL editor, or with
`supabase test db` once the CLI is linked. Silence means every assertion held.

| File | Covers |
|---|---|
| `01_profiles_rls.sql` | Pending members are gated; nobody self-approves or self-promotes |
| `02_team_rules.sql` | Hackathon exclusivity, project overlap, lead can't abandon a team |
| `03_skill_moderation.sql` | Tag merges are staff-only and lossless |
| `04_join_requests.sql` | Lead-only approval, team capacity, closed events, rejections |

They need two approved profiles to run, and clean up their own fixtures.

## Layout

```
src/app/(auth)/       login, signup
src/app/onboarding/   profile form → waiting room
src/app/pending/      waiting room (pending / rejected / needs-info)
src/app/(app)/        everything behind the approval gate
  dashboard/          teams, requests, announcements
  events/             event list, team browser, team pages
  directory/          skill & talent search
  admin/              approvals, birthdays, events, members, announcements, tags, audit
src/lib/actions/      server actions, one file per domain
src/lib/supabase/     browser / server clients + generated types
src/proxy.ts          session refresh and route gating (Next 16 renamed middleware → proxy)
supabase/tests/       RLS and business-rule assertions
```

## Design

Blue carries structure rather than just accents; jasmine is the warm
counterweight that stops a page of approval queues reading like a bank
dashboard. Space Grotesk for headings, Inter for UI, JetBrains Mono for data.

The signature motif is the **skill slot**: a team is a set of skills, some
covered and some open. Filled slots are solid blue, open slots dashed jasmine —
identical on the team browser, team page and suggestion panel, so "what's
missing" reads at a glance. Dark mode follows the OS with no theme library.

**Avatars are generated, not uploaded.** Each member gets a GitHub-style
identicon derived from their id: a mirrored 5×5 grid and a hue, rendered as
inline SVG. With ~100 members and a 2 MB photo cap, one directory page load
could have pulled ~150 MB of images against a 5 GB/month free-tier budget. An
identicon is DOM, not an image — no storage, no bandwidth, no upload path to
validate, and it can never 404 or go stale.

The generator lives in `src/components/shell/identicon.ts`, apart from the
component so it can be tested headlessly. That split is not ceremony: two
earlier versions produced an identical checkerboard for every member and looked
entirely reasonable in review. `src/components/shell/identicon.test.ts` asserts
distinctness and fill balance across 500 ids, which is what actually catches it.
Run with `npm run test:unit`.

Chapter-specific lists live in `src/lib/constants.ts` — edit that one file and
every form, filter and facet follows.

**Officer positions and departments are separate fields.** Seven people hold a
chapter-wide post (`designation`); everyone works in one of ten departments
(`department`). Keeping them apart is what makes "everyone in Cybersecurity"
countable — with a single combined field an officer would belong to no team.
Neither is required alone, but a complete profile needs at least one, enforced
by the `is_profile_complete` generated column rather than by form validation.
