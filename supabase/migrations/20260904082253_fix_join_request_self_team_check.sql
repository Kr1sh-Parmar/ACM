-- The "don't ask to join a team you're already on" check compared `tm.team_id`
-- against an unqualified `team_id`. Inside the sub-select, `team_members tm` is
-- the innermost scope, so that name bound to `tm.team_id` — not to the row being
-- inserted. Postgres stored the clause as `tm.team_id = tm.team_id`, which is
-- always true, collapsing the test into "is this person on ANY team at all".
--
-- So the moment you joined or created your first team, every later join request
-- you sent was refused by RLS, and the UI reported it as "the event may have
-- closed". Qualifying the outer column binds it to the new row again.
drop policy join_requests_insert on public.join_requests;

create policy join_requests_insert on public.join_requests
  for insert to authenticated
  with check (
    public.is_approved()
    and requester_id = (select auth.uid())
    and status = 'pending'
    and not exists (
      select 1 from public.team_members tm
      where tm.team_id = join_requests.team_id
        and tm.member_id = (select auth.uid())
    )
    and exists (
      select 1 from public.teams t
      join public.events e on e.id = t.event_id
      where t.id = join_requests.team_id and e.status = 'open'
    )
  );
