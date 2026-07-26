-- Birthdays ignore the year, which makes "this week" awkward in JS around the
-- 31 Dec / 1 Jan boundary and around 29 Feb. Postgres does the date maths here
-- so the app never has to.
--
-- Returns everyone with a birthday in the next `days_ahead` days, with
-- `days_away` = 0 meaning today.
create or replace function public.upcoming_birthdays(days_ahead int default 30)
returns table (
  id uuid,
  full_name text,
  photo_url text,
  designation text,
  branch text,
  birth_date date,
  days_away int
)
language sql stable security invoker set search_path = '' as $$
  with dated as (
    select
      p.id, p.full_name, p.photo_url, p.designation, p.branch, p.birth_date,
      -- This year's occurrence; if it has already passed, next year's.
      case
        when make_date(
               extract(year from current_date)::int,
               extract(month from p.birth_date)::int,
               least(
                 extract(day from p.birth_date)::int,
                 extract(day from (
                   date_trunc('month',
                     make_date(extract(year from current_date)::int,
                               extract(month from p.birth_date)::int, 1)
                   ) + interval '1 month - 1 day'
                 ))::int
               )
             ) >= current_date
        then make_date(
               extract(year from current_date)::int,
               extract(month from p.birth_date)::int,
               least(
                 extract(day from p.birth_date)::int,
                 extract(day from (
                   date_trunc('month',
                     make_date(extract(year from current_date)::int,
                               extract(month from p.birth_date)::int, 1)
                   ) + interval '1 month - 1 day'
                 ))::int
               )
             )
        else make_date(
               extract(year from current_date)::int + 1,
               extract(month from p.birth_date)::int,
               least(
                 extract(day from p.birth_date)::int,
                 extract(day from (
                   date_trunc('month',
                     make_date(extract(year from current_date)::int + 1,
                               extract(month from p.birth_date)::int, 1)
                   ) + interval '1 month - 1 day'
                 ))::int
               )
             )
      end as next_occurrence
    from public.profiles p
    where p.birth_date is not null
      and p.status = 'approved'
  )
  select id, full_name, photo_url, designation, branch, birth_date,
         (next_occurrence - current_date)::int as days_away
  from dated
  where (next_occurrence - current_date)::int <= days_ahead
  order by days_away, full_name;
$$;

-- SECURITY INVOKER, so the caller's RLS still applies: only staff can read other
-- members' rows anyway, and the admin pages already require it.
revoke execute on function public.upcoming_birthdays(int) from public, anon;
grant execute on function public.upcoming_birthdays(int) to authenticated;
