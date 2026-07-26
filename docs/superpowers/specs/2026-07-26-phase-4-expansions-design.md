# Phase 4 — Participation & Analytics — Design

**Date:** 2026-07-26
**Status:** Approved · planned in [`../plans/2026-07-26-phase-4a-participation-analytics.md`](../plans/2026-07-26-phase-4a-participation-analytics.md)
**Predecessor:** Phases 1–3 (profiles + approval gate, skills directory, event hosting, team formation, admin dashboard) — code-complete, database rules tested in `supabase/tests/01`–`04`.

---

## Context

The chapter app currently does three things: it gates membership behind manual admin
approval, it lets members advertise skills and find each other, and it runs
hackathon/project team formation. Section 6 of
[`context/ACM_Committee_Management_System_Spec.md`](../../../context/ACM_Committee_Management_System_Spec.md)
lists eight suggested expansions. **One is being built: participation & analytics.**

**A caveat recorded deliberately:** the app has not been deployed and no committee
member has used it. Choosing expansions without usage data is guesswork, and that
was raised before scoping. The decision was to build this feature first and ship
afterwards, so Phase 4D exists to close that gap rather than leaving it implicit.

### Decisions

| Decision | Choice |
|---|---|
| Scope | Participation & analytics only |
| Dropped | Showcase & resource hub · recruitment & bulk tools · mentorship · feedback & polls |
| Public surface | **None.** Every route stays behind the approval gate |
| Check-in trust | Self-service rotating code, plus admin override |
| Cost | Free tier throughout — no email, no cron, no external service |
| Order | 4A → 4D (ship it) |

### Why the rest was cut

Showcase and recruitment were scoped and then dropped by decision, not by discovery —
their full designs are preserved in git at commit `ff79ee4` if they are ever wanted
back. Mentorship and feedback were cut earlier because both depend on sustained
opt-in from people who are not yet using the tool at all.

Dropping the showcase removes the only public, unauthenticated surface from the plan,
which takes the single largest security risk off the table: no `anon` RLS policies,
no narrowed contributor view, no `proxy.ts` exemptions. Everything stays behind the
approval gate exactly as it is today.

### Everything here is free

Postgres, RLS and Storage are within the Supabase free tier for a chapter-sized
membership. `qrcode` generates locally in the browser — no QR service, no network
call. There is no outbound email, no `pg_cron`, and no paid dependency anywhere in
this phase.

Supabase's built-in mailer is also free, but it is capped at roughly 2 emails/hour,
which is why **Confirm email stays OFF** and admin approval remains the only gate.
That is a rate-limit decision, not a billing one — but the outcome is the same, and
leaving confirmation on is what would eventually force a paid SMTP provider.

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
under `search_path = ''`. Confirmed installed (v1.3) in the hosted project, and the
expression above was run against it: consecutive minute windows produce distinct
six-digit codes.

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

Charts are **CSS bars, not a charting library**. Every metric listed above is a bar
or a single number, and a bar is a `<span>` with a percentage width — pulling in
~500 KB of recharts to draw rectangles fails the "native platform feature covers it"
test. Add one when a genuine time series appears, not before.

CSV export goes through a single `toCsv()` helper in `src/lib/` so any later exporter
has something to reuse.

The one new dependency in this phase is `qrcode`, for generating the projected code.
That one cannot be done in CSS.

### Routes

```
/leaderboard                        approved members
/events/[id]/checkin                approved members — the QR target
/admin/events/[id]/attendance       staff: live count, manual add/remove
/admin/analytics                    staff: charts + CSV export
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

Two new SQL test files continuing `supabase/tests/01`–`04`, asserting against the
database rather than the UI, because the database is what enforces these rules.

| File | Asserts |
|---|---|
| `05_attendance.sql` | Stale code rejected; current code accepted; repeat check-in is idempotent; direct table writes refused for everyone; a member cannot mark someone else present; admin override lands, is attributed, and is reversible |
| `06_contributions.sql` | Points arithmetic matches the weights; weights are admin-only; deleting an event unwinds the points it granted |

Both assert on **specific** error text and row counts. A bare "it threw something"
assertion can pass for the wrong reason — that is exactly how the enum-cast bug in
`respond_to_join_request` hid through an entire test run in Phase 2.

Every new `SECURITY DEFINER` function gets the same treatment as the existing ones:
`search_path` pinned to `''`, execute revoked from `public`, granted only where needed.
Every new table has RLS enabled with no exceptions.

Beyond SQL: `npm run build`, `npm run lint` and `tsc` green at the end of each phase,
and each phase ends in a state that can be opened in a browser and checked.

---

## Out of Scope

Project showcase · resource hub · recruitment cycles · interview scheduling · bulk
approve/reject · mentorship/buddy system · feedback forms and interest polls ·
segmented email · alumni roles · peer endorsements · any public or unauthenticated
route.

All are additive. None require changing the schema above. The showcase and
recruitment designs are preserved in git at commit `ff79ee4` should they ever be
wanted back.

---

## Open Items

- ~~Confirm pgcrypto is enabled~~ — resolved: installed, `extensions` schema, HMAC
  expression verified against the live database.
- Chapter-specific lists (branches, designations) are still placeholders in
  `src/lib/constants.ts`. Contribution weights seed at 10/15/25/40 for
  attend/join/lead/host and need the same review once the chapter decides what it
  actually wants to reward.
- **Migrations must be pulled into the repo before any 4A migration is written.**
  The 13 existing migrations live only in the hosted project, so migrations 14 and 15
  would land with nothing to review them against and no rollback. Promoted out of 4D
  into Task 1 of the 4A plan.
