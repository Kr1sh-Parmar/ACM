import type { Proficiency } from "@/lib/constants";

/**
 * Shared shape for a team as the browser and team page need it. Built once in
 * `buildTeamViews` so both screens agree on what "covered" and "open" mean.
 */
export type TeamMemberView = {
  id: string;
  full_name: string;
  skills: { name: string; proficiency: Proficiency }[];
};

export type TeamView = {
  id: string;
  name: string;
  description: string | null;
  track: string | null;
  lead_id: string;
  members: TeamMemberView[];
  required: string[];
  /** Required skills at least one current member holds. */
  covered: Set<string>;
  missing: string[];
  openSlots: number;
  isFull: boolean;
};

type RawTeam = {
  id: string;
  name: string;
  description: string | null;
  track: string | null;
  lead_id: string;
  team_members: { member_id: string }[];
  team_required_skills: { skills: { name: string } | null }[];
};

/**
 * Open slots are derived from the event's team_max minus the current roster,
 * never stored. A counter column would need every join, leave, removal and
 * disband to remember to update it — and one that forgets is worse than none.
 */
export function buildTeamViews(
  teams: RawTeam[],
  teamMax: number,
  membersById: Map<string, TeamMemberView>,
): TeamView[] {
  return teams.map((team) => {
    const members = team.team_members
      .map((tm) => membersById.get(tm.member_id))
      .filter((m): m is TeamMemberView => Boolean(m));

    const required = team.team_required_skills
      .map((r) => r.skills?.name)
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b));

    const held = new Set(members.flatMap((m) => m.skills.map((s) => s.name)));
    const covered = new Set(required.filter((skill) => held.has(skill)));
    const missing = required.filter((skill) => !covered.has(skill));
    const openSlots = Math.max(0, teamMax - members.length);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      track: team.track,
      lead_id: team.lead_id,
      members,
      required,
      covered,
      missing,
      openSlots,
      isFull: openSlots === 0,
    };
  });
}
