"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/auth";

export type TeamFormState = { error?: string };

const orNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Postgres codes we can turn into something a human wants to read. */
const UNIQUE_VIOLATION = "23505";

/**
 * Start a team and become its lead. The lead is added to team_members by a
 * trigger, which is also what trips the one-team-per-hackathon index — so
 * "you're already on a team" surfaces here as a unique violation rather than
 * from a check we wrote. Translating it beats duplicating the rule in JS.
 */
export async function createTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const profile = await requireApproved();
  const supabase = await createClient();

  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = orNull(formData.get("description"));
  const track = orNull(formData.get("track"));
  const skillIds = formData.getAll("skill_id").map(String).filter(Boolean);

  if (!eventId) return { error: "Missing event." };
  if (name.length < 2 || name.length > 60) {
    return { error: "Team names are between 2 and 60 characters." };
  }
  if (description && description.length > 1000) {
    return { error: "Keep the description under 1000 characters." };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ event_id: eventId, name, description, track, lead_id: profile.id })
    .select("id")
    .single();

  if (error || !team) {
    if (error?.code === UNIQUE_VIOLATION) {
      return {
        error: error.message.includes("one_team_per_hackathon")
          ? "You're already on a team in this hackathon. Leave it before starting another."
          : "A team with that name already exists in this event.",
      };
    }
    return { error: "That team couldn't be created. The event may have closed." };
  }

  if (skillIds.length > 0) {
    await supabase
      .from("team_required_skills")
      .insert(skillIds.map((skill_id) => ({ team_id: team.id, skill_id })));
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/teams/${team.id}`);
}

export async function updateTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  await requireApproved();
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = orNull(formData.get("description"));
  const track = orNull(formData.get("track"));
  const skillIds = formData.getAll("skill_id").map(String).filter(Boolean);

  if (!teamId) return { error: "Missing team." };
  if (name.length < 2 || name.length > 60) {
    return { error: "Team names are between 2 and 60 characters." };
  }

  // RLS restricts this to the lead (or an admin); no extra check needed here.
  const { error } = await supabase
    .from("teams")
    .update({ name, description, track })
    .eq("id", teamId);

  if (error) return { error: "Those changes couldn't be saved." };

  // Required skills are a small set — replacing them wholesale is simpler and
  // cheaper than diffing, and the lead is the only writer.
  await supabase.from("team_required_skills").delete().eq("team_id", teamId);
  if (skillIds.length > 0) {
    await supabase
      .from("team_required_skills")
      .insert(skillIds.map((skill_id) => ({ team_id: teamId, skill_id })));
  }

  revalidatePath(`/events/${eventId}/teams/${teamId}`);
  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function requestToJoin(formData: FormData): Promise<TeamFormState> {
  const profile = await requireApproved();
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const message = orNull(formData.get("message"));

  if (!teamId) return { error: "Missing team." };
  if (message && message.length > 300) return { error: "Keep your message under 300 characters." };

  const { error } = await supabase
    .from("join_requests")
    .insert({ team_id: teamId, requester_id: profile.id, message });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "You've already asked to join this team." };
    }
    return { error: "That request couldn't be sent. The event may have closed." };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/teams/${teamId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function withdrawRequest(formData: FormData): Promise<TeamFormState> {
  await requireApproved();
  const supabase = await createClient();

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return { error: "Missing request." };

  const { error } = await supabase.from("join_requests").delete().eq("id", requestId);
  if (error) return { error: "That request couldn't be withdrawn." };

  revalidatePath("/dashboard");
  return {};
}

/**
 * Approve or reject a join request. Goes through respond_to_join_request(),
 * which checks the caller leads the team, that the event is still open, that
 * the team has room, and that the requester isn't already on another team in
 * the same hackathon — all inside one transaction.
 */
export async function respondToRequest(formData: FormData): Promise<TeamFormState> {
  await requireApproved();
  const supabase = await createClient();

  const requestId = String(formData.get("request_id") ?? "");
  const approve = formData.get("approve") === "true";
  const teamId = String(formData.get("team_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  if (!requestId) return { error: "Missing request." };

  const { error } = await supabase.rpc("respond_to_join_request", {
    request_id: requestId,
    approve,
  });

  // The function raises with messages written for members, so pass them through.
  if (error) return { error: error.message || "That request couldn't be answered." };

  revalidatePath(`/events/${eventId}/teams/${teamId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function leaveTeam(formData: FormData): Promise<TeamFormState> {
  const profile = await requireApproved();
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const memberId = String(formData.get("member_id") ?? profile.id);
  const eventId = String(formData.get("event_id") ?? "");
  if (!teamId) return { error: "Missing team." };

  // RLS allows removing yourself, or anyone if you lead the team. A trigger
  // stops the lead removing themselves and orphaning it.
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("member_id", memberId);

  if (error) {
    return {
      error: error.message.includes("team lead cannot leave")
        ? "You lead this team. Disband it, or hand it to someone else first."
        : "That didn't work. Try again.",
    };
  }

  revalidatePath(`/events/${eventId}/teams/${teamId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function disbandTeam(formData: FormData): Promise<TeamFormState> {
  await requireApproved();
  const supabase = await createClient();

  const teamId = String(formData.get("team_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!teamId) return { error: "Missing team." };

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: "That team couldn't be disbanded." };

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}
