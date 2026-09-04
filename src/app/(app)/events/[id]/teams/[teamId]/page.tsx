import type { Metadata } from "next";
import Link from "next/link";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildTeamViews, type TeamMemberView } from "@/lib/teams";
import { roleLabel, type Proficiency } from "@/lib/constants";
import { SkillSlots } from "@/components/teams/skill-slots";
import { coverageRim } from "@/components/shell/coverage";
import { JoinRequestList } from "@/components/teams/join-request-list";
import { TeamMemberActions } from "@/components/teams/team-member-actions";
import { AddGuestDialog, RemoveGuestButton } from "@/components/teams/guest-actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const profile = await requireApproved();
  const { id: eventId, teamId } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: team }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
    supabase
      .from("teams")
      .select(
        "id, name, description, track, lead_id, team_members(member_id), team_guests(id, full_name), team_required_skills(skills(name))",
      )
      .eq("id", teamId)
      .maybeSingle(),
  ]);

  if (!event || !team) notFound();

  const memberIds = team.team_members.map((m) => m.member_id);

  const [{ data: memberRows }, { data: skillRows }] = await Promise.all([
    memberIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, designation, department")
          .in("id", memberIds)
      : Promise.resolve({ data: [] as never[] }),
    memberIds.length
      ? supabase
          .from("member_skills")
          .select("member_id, proficiency, skills(name)")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const skillsByMember = new Map<string, { name: string; proficiency: Proficiency }[]>();
  for (const row of skillRows ?? []) {
    const list = skillsByMember.get(row.member_id) ?? [];
    if (row.skills?.name) list.push({ name: row.skills.name, proficiency: row.proficiency });
    skillsByMember.set(row.member_id, list);
  }

  const roleById = new Map(
    (memberRows ?? []).map((m) => [m.id, roleLabel(m.designation, m.department)]),
  );

  const membersById = new Map<string, TeamMemberView>(
    (memberRows ?? []).map((m) => [
      m.id,
      {
        id: m.id,
        full_name: m.full_name,
        skills: skillsByMember.get(m.id) ?? [],
      },
    ]),
  );

  const [view] = buildTeamViews([team], event.team_max, membersById);
  const isLead = team.lead_id === profile.id;
  const isMember = view.members.some((m) => m.id === profile.id);

  // Join requests are visible to the lead only — RLS enforces that too.
  const { data: requests } = isLead
    ? await supabase
        .from("join_requests")
        .select("id, message, created_at, profiles!join_requests_requester_id_fkey(id, full_name)")
        .eq("team_id", teamId)
        .eq("status", "pending")
        .order("created_at")
    : { data: [] };

  // Suggested teammates: available members who hold a skill this team still
  // needs and aren't already on it. Only worth showing while slots remain.
  let suggestions: { id: string; full_name: string; matches: string[] }[] = [];

  if (isLead && view.missing.length > 0 && !view.isFull) {
    const { data: candidates } = await supabase
      .from("member_skills")
      .select("member_id, skills!inner(name), profiles!inner(id, full_name, open_to_invites, status)")
      .in("skills.name", view.missing)
      .eq("profiles.open_to_invites", true)
      .eq("profiles.status", "approved");

    const byMember = new Map<string, { name: string; matches: Set<string> }>();
    for (const row of candidates ?? []) {
      if (memberIds.includes(row.member_id)) continue;
      const entry = byMember.get(row.member_id) ?? {
        name: row.profiles.full_name,
        matches: new Set<string>(),
      };
      entry.matches.add(row.skills.name);
      byMember.set(row.member_id, entry);
    }

    suggestions = [...byMember.entries()]
      .map(([id, v]) => ({
        id,
        full_name: v.name,
        matches: [...v.matches].sort(),
      }))
      // Most gaps closed first.
      .sort((a, b) => b.matches.length - a.matches.length)
      .slice(0, 6);
  }

  return (
    <div>
      <p className="font-mono text-sm text-muted-foreground">
        <Link href={`/events/${eventId}`} className="hover:underline">
          {event.title}
        </Link>
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
            {view.name}
          </h1>
          {view.track && <p className="mt-1 font-mono text-sm text-muted-foreground">{view.track}</p>}
        </div>
        <span
          className={`font-mono text-sm ${
            view.isFull ? "text-muted-foreground" : "text-jasmine"
          }`}
        >
          {view.members.length + view.guests.length}/{event.team_max}
          {!view.isFull && ` · ${view.openSlots} open`}
        </span>
      </div>

      {view.description && (
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{view.description}</p>
      )}

      {/* The signature in its home position: this card's rim warms toward
          jasmine as the team's skill coverage drops. */}
      <section
        className="glass rim mt-10 rounded-2xl p-6 shadow-glow-md"
        style={coverageRim(view.covered.size, view.required.length)}
      >
        <h2 className="font-heading text-lg font-semibold">Skills this team asked for</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solid means someone on the team covers it. Dashed means it&apos;s still open.
        </p>
        <div className="mt-4">
          <SkillSlots required={view.required} covered={view.covered} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-lg font-semibold">Members</h2>
        <ul className="solid rim mt-4 divide-y divide-white/7 overflow-hidden rounded-2xl">
          {view.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <MemberAvatar
                id={member.id}
                name={member.full_name}
                className="size-10 ring-1 ring-white/15"
              />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <Link href={`/directory/${member.id}`} className="hover:underline">
                    {member.full_name}
                  </Link>
                  {member.id === view.lead_id && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Crown className="size-3" aria-hidden />
                      Lead
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {roleById.get(member.id) ?? "No role yet"}
                </p>
                {member.skills.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {member.skills.slice(0, 5).map((skill) => (
                      <li
                        key={skill.name}
                        className="rounded-full border border-white/12 bg-white/4 px-2.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <TeamMemberActions
                teamId={view.id}
                eventId={eventId}
                memberId={member.id}
                memberName={member.full_name}
                isSelf={member.id === profile.id}
                isLeadRow={member.id === view.lead_id}
                viewerIsLead={isLead}
              />
            </li>
          ))}

          {/* Guests sit in the same list because they occupy the same slots.
              The badge is what says they are not committee members. */}
          {view.guests.map((guest) => (
            <li key={guest.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <MemberAvatar
                id={guest.id}
                name={guest.full_name}
                className="size-10 ring-1 ring-white/15"
              />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {guest.full_name}
                  <Badge variant="outline" className="text-xs">
                    External
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">Not an ACM member</p>
              </div>

              {isLead && (
                <RemoveGuestButton
                  guestId={guest.id}
                  teamId={view.id}
                  eventId={eventId}
                  name={guest.full_name}
                />
              )}
            </li>
          ))}
        </ul>

        {isLead && !view.isFull && event.status === "open" && (
          <div className="mt-4">
            <AddGuestDialog teamId={view.id} eventId={eventId} />
          </div>
        )}
      </section>

      {isLead && (
        <section className="mt-12">
          <h2 className="font-heading text-lg font-semibold">
            Join requests {requests && requests.length > 0 && `(${requests.length})`}
          </h2>
          <JoinRequestList
            eventId={eventId}
            teamId={view.id}
            requests={(requests ?? []).map((r) => ({
              id: r.id,
              message: r.message,
              requester: {
                id: r.profiles?.id ?? "",
                full_name: r.profiles?.full_name ?? "Unknown",
              },
            }))}
            teamIsFull={view.isFull}
          />
        </section>
      )}

      {isLead && suggestions.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-lg font-semibold">Members who could fill the gaps</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open to invites and know something this team still needs.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {suggestions.map((person) => (
              <li
                key={person.id}
                className="glass rim flex items-center gap-3 rounded-2xl p-4 shadow-glow-sm"
                style={{ "--rim-hue": "45deg" } as React.CSSProperties}
              >
                <MemberAvatar
                  id={person.id}
                  name={person.full_name}
                  className="size-9 ring-1 ring-white/15"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <Link href={`/directory/${person.id}`} className="hover:underline">
                      {person.full_name}
                    </Link>
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {person.matches.map((skill) => (
                      <li key={skill} className="slot slot-open h-6 px-2 text-[11px]">
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isMember && (
        <p className="mt-12 text-sm text-muted-foreground">
          {isLead
            ? "You lead this team. Removing everyone else and disbanding is done from the member list above."
            : "You're on this team."}
        </p>
      )}
    </div>
  );
}
