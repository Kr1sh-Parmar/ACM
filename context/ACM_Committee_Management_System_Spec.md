# ACM Committee Management System — Build Specification

> **Purpose of this document:** A complete specification for Claude Code to develop the ACM chapter's internal committee management web application. This is the single source of truth for scope, features, data model, and design.

---

## 1. Overview

An **internal web application** for an ACM student chapter committee. Committee members create profiles that admins manually verify and approve. Once approved, members unlock core features — the flagship being a **hackathon/project team-building system** (form teams, request to join, search teams) modeled on Hack2skill's flow.

The app is admin-curated: admins approve profiles, view member birthdays (to wish them on ACM socials), and host hackathons and projects for members to join.

### Core principles
- **Approval-gated access** — no core features until an admin approves the profile.
- **Admin-curated** — admins control who's in, what events run, and moderation.
- **Beginner-inclusive** — designed so newcomers can find teams and teammates easily.
- **Professional yet cool** — polished enough for faculty/IIC reports, modern enough to feel exciting.

---

## 2. Tech Stack

- **Frontend:** React + TypeScript, Tailwind CSS. (Next.js preferred if SSR/routing benefits are wanted; otherwise Vite.)
- **Backend / DB / Auth:** **Supabase** (Postgres, Auth, Row-Level Security, Realtime, Storage, Edge Functions, pg_cron).
- **Animations:** Framer Motion for scroll/entrance animations; subtle particle or gradient effects for hero sections.
- **State/Data:** Supabase client + React Query (TanStack) for caching.
- **Deployment:** Vercel (frontend) + Supabase cloud.

---

## 3. User Roles

| Role | Capabilities |
|---|---|
| **Super Admin** | Full control; manage other admins; all admin powers. |
| **Admin** | Approve/reject profiles, host hackathons/projects, broadcast announcements. |
| **Moderator** | Content & skill-tag moderation only (no approvals). |
| **Member** | Approved committee member; full access to team-building, directory, profile. |
| **Pending** | Registered but not yet approved; can only edit their own profile. |
| **Alumni** *(optional)* | Read-only + mentorship opt-in. |

Access is enforced via a `role` field + `status` field on the profile, backed by Supabase **Row-Level Security (RLS)** policies.

---

## 4. Core Features

### 4.1 Profile Creation & Admin Approval

**Member provides at signup:**
- Full name
- Role / designation in ACM
- Branch
- Year of study
- Email
- **Birth date** *(key field — used by admins for birthday wishes on socials)*
- Profile photo
- Skills (see Skill Directory)
- Social links (GitHub, LinkedIn) — optional
- Short bio — optional

**Approval flow:**
- New profile → `status = pending`.
- Appears in the admin **Approval Queue**.
- Admin manually verifies and **Approves / Rejects / Requests more info**.
- Rejection captures a reason (logged; optionally emailed to member).
- Only `status = approved` members can access core features (enforced by RLS).

### 4.2 Hackathon & Project Team Formation (flagship, Hack2skill-style)

**Admin hosts an event:**
- Type: **Hackathon** or **Project**
- Title, description, banner image
- Start/end dates, registration deadline
- Team size (min/max)
- Tracks / themes (optional)
- Status: `Draft` / `Open` / `Closed`

**Member actions on an open event:**
- **Create a team** → becomes team lead; sets team name, description, required skills, open slots.
- **Browse/search teams** — filter by required skills, open slots, track.
- **Request to join a team** → team lead **approves/rejects** the request.
- Leave a team; team lead can remove members or disband.
- View their own teams and pending requests.

**Team page shows:** members, roles, skills covered vs. still needed, open slots, join requests (lead only).

**Nice-to-have:** "Suggested teammates" — surface available members whose skills match what the team still needs.

### 4.3 Skill & Talent Directory

- Skills stored in a **normalized table** (not a free-text field) so they're filterable and consistent.
- Members **self-manage their skills** on the platform: add from a curated tag list + allow custom tags.
- **Proficiency** per skill: Beginner / Intermediate / Advanced.
- **"Open to team invites"** toggle to signal availability during hackathon season.
- **Search/filter** by skill(s), proficiency, branch, year, availability.
- **"Looking for someone who knows X"** → returns available members with that skill.
- *(Optional later)* peer endorsements.

Admins can **moderate skill tags** — merge duplicates ("JS" / "JavaScript"), retire unused tags.

---

## 5. Admin Dashboard (curated)

Split into focused sections, not one cluttered page.

**5.1 Overview (landing)**
- Quick stats: total members, pending approvals, active hackathons, teams formed.
- Recent activity feed.

**5.2 Approval Queue**
- Pending profiles as cards: photo, name, branch, year, role, socials.
- Quick actions: Approve / Reject / Request more info.
- Reject reason field (logged).
- Live badge count of pending approvals (Supabase Realtime).

**5.3 Birthday Panel** *(admin-only)*
- Tabs: Today / This week / This month.
- Members enter birth date at signup; admins use this panel to wish them on ACM socials.
- One-click copy caption / generate a wish graphic.
- Optional: push a birthday digest to Discord/Slack via webhook.

**5.4 Hackathon & Project Hosting**
- Create/edit/close events.
- View all teams per event, member counts, teams still recruiting.
- Toggle event status: Draft / Open / Closed.
- View join-request activity.

**5.5 Member Management**
- Full directory with search + skill filters.
- Promote/demote roles, deactivate members.
- Skill tag moderation (merge/retire).

**5.6 Announcements & Broadcasts**
- Post announcements to members' feeds (hackathon updates, deadlines).
- Optional push to Discord/Slack/email via webhook.
- Pin urgent notices.

**5.7 Audit Log**
- Record admin actions (who approved whom, who closed an event) — important with multiple admins.

---

## 6. Suggested Expansions (build after MVP)

- **Attendance & Contribution Tracking** — QR check-in for events, contribution points/leaderboard to identify active members for Core promotions.
- **Project Showcase** — members publish completed projects (tech stack, demo, contributors); becomes the chapter's public-facing portfolio.
- **Mentorship / Buddy System** — seniors opt in as mentors, beginners get paired (supports beginner inclusivity).
- **Resource Hub** — curated learning links, recordings, templates.
- **Feedback & Forms** — post-event feedback with response analytics; interest polls.
- **Recruitment Cycle Mode** — application intake, interview scheduling, reviewer notes for new-member drives.
- **Analytics Dashboard** — participation rates, branch/year distribution, exportable reports for IIC/faculty.
- **Bulk tools** — bulk approve/reject, CSV export, segmented emails.

---

## 7. Data Model (Supabase / Postgres)

Starter schema — refine during development.

```
profiles
  id (uuid, FK -> auth.users)
  full_name, role, branch, year, email
  birth_date            -- used for birthday panel
  photo_url, bio
  github_url, linkedin_url
  status                -- pending | approved | rejected
  admin_role            -- super_admin | admin | moderator | null
  open_to_invites (bool)
  created_at

skills
  id, name, category    -- curated master list

member_skills
  member_id (FK -> profiles)
  skill_id  (FK -> skills)
  proficiency           -- beginner | intermediate | advanced
  is_custom (bool)

events                  -- hackathons & projects
  id, type              -- hackathon | project
  title, description, banner_url
  start_date, end_date, registration_deadline
  team_min, team_max
  status                -- draft | open | closed
  created_by (FK -> profiles)

teams
  id, event_id (FK -> events)
  name, description
  required_skills (text[] or join table)
  lead_id (FK -> profiles)
  open_slots (int)
  created_at

team_members
  team_id (FK -> teams)
  member_id (FK -> profiles)
  joined_at

join_requests
  id, team_id (FK -> teams)
  requester_id (FK -> profiles)
  status                -- pending | approved | rejected
  created_at

announcements
  id, title, body, pinned (bool)
  created_by, created_at

audit_log
  id, actor_id, action, target_id, meta (jsonb), created_at
```

### Key RLS policies
- Members can `select/update` **only their own** `profiles` row (except admins).
- Only `status = approved` members can access `events`, `teams`, `join_requests`.
- Only `admin_role IS NOT NULL` can write to `events`, `announcements`, or change others' `status`.
- Team lead (`teams.lead_id = auth.uid()`) can approve/reject that team's `join_requests`.
- `member_skills` writable only by its owner.

### Realtime / scheduled
- **Realtime** subscriptions on `join_requests` and the approval queue → live badges.
- **pg_cron + Edge Function** for scheduled birthday digests.
- **Storage buckets** for profile photos and event banners.

---

## 8. Design Direction

**Brand:** ACM — **blue** is the primary color.

**Palette**
- **Primary:** ACM Blue — use `#0066CC` / `#1B4F9C` family (pick and define a scale: 50→900).
- **Backgrounds:** **White** (`#FFFFFF`) and **Jasmine** (`#F8E7A1` / soft warm off-white-yellow) as a secondary warm background/accent.
- **Neutrals:** slate grays for text and borders.
- **Accents:** a brighter blue or cyan for CTAs and highlights; keep jasmine for warm section backgrounds and subtle highlights.

**Vibe:** professional **and** cool at the same time.
- Clean, generous whitespace; card-based layouts; rounded corners; soft shadows.
- **Scroll animations** (Framer Motion) — fade/slide entrances, staggered lists.
- Subtle **particle effects** or **animated gradient mesh** in the hero/landing area (blue-tinted, tasteful — not distracting).
- Micro-interactions on buttons, cards, and join/approve actions.
- Modern sans-serif type (e.g., Inter / Geist / Space Grotesk for headings).
- Dark-mode ready (optional but recommended).

**Feel target:** looks great in a faculty/IIC report screenshot, but exciting enough that members *want* to use it.

**Key screens to design well**
1. Landing / login (hero with animation, ACM branding).
2. Profile creation form.
3. Member dashboard (my teams, events, requests).
4. Event page + team browser (the flagship — make it shine).
5. Team page (members, skills needed, join requests).
6. Skill directory / search.
7. Admin dashboard (all sections above) — clean, data-dense but organized.

---

## 9. Suggested Build Order (MVP → later)

**Phase 1 — Foundation**
1. Supabase project, `profiles` table, Auth, RLS scaffolding.
2. Profile creation + photo upload.
3. Admin approval queue (approve/reject/request info).
4. Role/status gating.

**Phase 2 — Flagship**
5. Skill directory (tables, self-service editing, search/filter).
6. Event hosting (admin).
7. Team formation: create team, browse/search, request-to-join, lead approves.

**Phase 3 — Admin polish**
8. Birthday panel.
9. Announcements/broadcasts.
10. Overview stats + audit log.

**Phase 4 — Expansions**
11. Project showcase, attendance/contribution, mentorship, resource hub, feedback forms, recruitment mode, analytics.

**Design pass** runs alongside every phase — apply the blue/white/jasmine system and animation direction from the start.

---

*End of specification.*
