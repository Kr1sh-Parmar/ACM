-- The chapter has two separate structures: seven officer positions, and ten
-- departments people actually work in. Cramming both into `designation` would
-- mean an officer has no department, so "everyone in Cybersecurity" could never
-- be counted. They get their own columns.

alter table public.profiles add column if not exists department text;

-- is_profile_complete required a designation. Now that designation means
-- "officer position" and only ~7 of ~100 members hold one, that rule would
-- strand everyone else in onboarding forever. A profile is complete when the
-- member belongs SOMEWHERE: an officer post, a department, or both.
--
-- Generated columns cannot be altered in place, so it is dropped and rebuilt.
alter table public.profiles drop column if exists is_profile_complete;

alter table public.profiles
  add column is_profile_complete boolean
  generated always as (
    branch     is not null
    and year   is not null
    and birth_date is not null
    and (designation is not null or department is not null)
  ) stored;

-- Existing rows carry designations from the old flat list. Officer titles that
-- survived are kept or renamed; the rest were really departments, so they move
-- across. Anything genuinely ambiguous ('Member', 'Core Member') is cleared,
-- which marks that profile incomplete and prompts the member to pick a
-- department next time they open the app - the correct outcome when the
-- chapter's structure changes underneath them.
update public.profiles set designation = 'General Secretary' where designation = 'Secretary';
update public.profiles set designation = 'Tech Supervisor'   where designation = 'Technical Head';

update public.profiles set department = 'Graphic Designing', designation = null
  where designation = 'Design Head';
update public.profiles set department = 'Public Relations', designation = null
  where designation = 'PR & Marketing Head';
update public.profiles set department = 'Event Management', designation = null
  where designation = 'Event Head';

update public.profiles set designation = null
  where designation is not null
    and designation not in (
      'President', 'Vice President', 'Treasurer', 'Web Master',
      'Membership Chair', 'General Secretary', 'Tech Supervisor'
    );
