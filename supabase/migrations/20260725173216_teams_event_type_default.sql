-- The value is irrelevant — fill_team_event_type() overwrites it on every insert
-- and update. The default exists purely so callers (and the generated TypeScript
-- Insert type) don't have to supply a column the database derives for them.
alter table public.teams alter column event_type set default 'project';
