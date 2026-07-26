-- Derived, not stored by the app, so it can never drift out of sync with the
-- fields it describes. The proxy reads it to decide between /onboarding and /pending.
alter table public.profiles
  add column is_profile_complete boolean
  generated always as (
    branch is not null
    and year is not null
    and birth_date is not null
    and designation is not null
  ) stored;
