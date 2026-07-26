-- upcoming_birthdays still selected profiles.photo_url, which the previous
-- migration dropped. Postgres does not track column dependencies inside a
-- function body, so the ALTER TABLE succeeded and left this broken until the
-- next call - which would have been a 500 on /admin/birthdays.
--
-- The return type changes, so the function has to be dropped first: CREATE OR
-- REPLACE cannot alter a RETURNS TABLE signature.

drop function if exists public.upcoming_birthdays(integer);

create function public.upcoming_birthdays(days_ahead integer default 30)
returns table (
  id uuid, full_name text, designation text, branch text,
  birth_date date, days_away integer
)
language sql
stable
set search_path to ''
as $function$
  with dated as (
    select
      p.id, p.full_name, p.designation, p.branch, p.birth_date,
      -- This year's occurrence; if it has already passed, next year's.
      -- `least(... , last day of that month)` keeps 29 Feb valid in a non-leap
      -- year instead of raising a date-out-of-range error.
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
  select id, full_name, designation, branch, birth_date,
         (next_occurrence - current_date)::int as days_away
  from dated
  where (next_occurrence - current_date)::int <= days_ahead
  order by days_away, full_name;
$function$;

revoke all on function public.upcoming_birthdays(integer) from public, anon;
grant execute on function public.upcoming_birthdays(integer) to authenticated;
