import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildTeamViews, type TeamMemberView } from "@/lib/teams";
import type { Proficiency } from "@/lib/constants";
import { TeamBrowser } from "@/components/teams/team-browser";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireApproved();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();

  const [{ data: teams }, { data: allSkills }, { data: myRequests }] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, name, description, track, lead_id, team_members(member_id), team_guests(id, full_name), team_required_skills(skills(name))",
      )
      .eq("event_id", id)
      .order("created_at"),
    supabase.from("skills").select("id, name, category").eq("is_active", true).order("name"),
    supabase.from("join_requests").select("team_id, status").eq("requester_id", profile.id),
  ]);

  // One round trip for every member on every team, then stitched locally —
  // cheaper than an embed per team and keeps each member's full skill list.
  const memberIds = [...new Set((teams ?? []).flatMap((t) => t.team_members.map((m) => m.member_id)))];

  const [{ data: memberRows }, { data: skillRows }] = await Promise.all([
    memberIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
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

  const membersById = new Map<string, TeamMemberView>(
    (memberRows ?? []).map((m) => [
      m.id,
      { ...m, skills: skillsByMember.get(m.id) ?? [] },
    ]),
  );

  const views = buildTeamViews(teams ?? [], event.team_max, membersById);

  const myTeam = views.find((t) => t.members.some((m) => m.id === profile.id));
  const requestedTeamIds = new Set(
    (myRequests ?? []).filter((r) => r.status === "pending").map((r) => r.team_id),
  );

  const isOpen = event.status === "open";
  // In a hackathon you get one team, so once you're on one there is nothing left
  // to start or ask to join. Projects have no such limit — which is why this one
  // flag drives both affordances.
  const canJoinAnother = isOpen && !(event.type === "hackathon" && myTeam);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono capitalize">
              {event.type}
            </Badge>
            {!isOpen && <Badge variant="secondary">Registration closed</Badge>}
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance">
            {event.title}
          </h1>
          {event.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
          )}
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            Teams of {event.team_min}–{event.team_max}
            {event.registration_deadline && ` · register by ${event.registration_deadline}`}
          </p>
        </div>

        {canJoinAnother && (
          <CreateTeamDialog
            eventId={event.id}
            tracks={event.tracks}
            skills={allSkills ?? []}
          />
        )}
      </div>

      {myTeam && (
        <div className="rim mt-8 rounded-2xl border border-acm-300/25 bg-acm-500/12 p-5">
          <p className="text-sm text-acm-100">
            You&apos;re on{" "}
            <Link
              href={`/events/${event.id}/teams/${myTeam.id}`}
              className="font-medium underline underline-offset-2"
            >
              {myTeam.name}
            </Link>
            {myTeam.lead_id === profile.id && " — you lead it"}.
          </p>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Users className="size-[1.1rem] text-acm-300" aria-hidden />
          <h2 className="font-heading text-xl font-semibold">
            {views.length} {views.length === 1 ? "team" : "teams"}
          </h2>
        </div>

        {views.length === 0 ? (
          <EmptyState className="mt-6" icon={Users} title="No teams yet">
            {canJoinAnother
              ? "Start the first one and list what you're looking for."
              : "Nothing here yet."}
          </EmptyState>
        ) : (
          <TeamBrowser
            eventId={event.id}
            teams={views.map((t) => ({
              ...t,
              covered: [...t.covered],
              members: t.members.map((m) => ({
                id: m.id,
                full_name: m.full_name,
              })),
            }))}
            currentMemberId={profile.id}
            canRequest={canJoinAnother}
            requestedTeamIds={[...requestedTeamIds]}
          />
        )}
      </section>
    </div>
  );
}
