import type { Metadata } from "next";
import { MemberAvatar } from "@/components/shell/member-avatar";
import { SearchX } from "lucide-react";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROFICIENCIES, roleLabel, type Proficiency } from "@/lib/constants";
import { DirectoryFilters } from "@/components/directory/directory-filters";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Member directory" };

const YEAR_LABEL = ["", "1st", "2nd", "3rd", "4th", "5th"];

/** "At least intermediate" means intermediate or advanced. */
function atLeast(level: string | undefined): Proficiency[] {
  const i = PROFICIENCIES.indexOf(level as Proficiency);
  return i === -1 ? [...PROFICIENCIES] : PROFICIENCIES.slice(i);
}

const asArray = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireApproved();
  const params = await searchParams;
  const supabase = await createClient();

  const skillIds = asArray(params.skill);
  const levels = atLeast(typeof params.prof === "string" ? params.prof : undefined);

  const { data: allSkills } = await supabase
    .from("skills")
    .select("id, name, category")
    .eq("is_active", true)
    .order("name");

  // Skill filtering is an intersection: a member must hold EVERY selected skill
  // at the required level. Doing it here rather than in the profiles query keeps
  // each member's full skill list intact for display.
  let idsWithSkills: string[] | null = null;
  if (skillIds.length > 0) {
    const { data: matches } = await supabase
      .from("member_skills")
      .select("member_id, skill_id")
      .in("skill_id", skillIds)
      .in("proficiency", levels);

    const counts = new Map<string, Set<string>>();
    for (const row of matches ?? []) {
      const set = counts.get(row.member_id) ?? new Set<string>();
      set.add(row.skill_id);
      counts.set(row.member_id, set);
    }
    idsWithSkills = [...counts.entries()]
      .filter(([, held]) => held.size === skillIds.length)
      .map(([id]) => id);
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, designation, department, branch, year, bio, open_to_invites")
    .eq("status", "approved")
    .order("full_name");

  if (idsWithSkills) query = query.in("id", idsWithSkills.length ? idsWithSkills : [""]);
  if (typeof params.q === "string" && params.q) query = query.ilike("full_name", `%${params.q}%`);
  if (typeof params.department === "string" && params.department) {
    query = query.eq("department", params.department);
  }
  if (typeof params.designation === "string" && params.designation) {
    query = query.eq("designation", params.designation);
  }
  if (typeof params.branch === "string" && params.branch) query = query.eq("branch", params.branch);
  if (typeof params.year === "string" && params.year) query = query.eq("year", Number(params.year));
  if (params.open === "1") query = query.eq("open_to_invites", true);

  const { data: members } = await query;

  const memberIds = (members ?? []).map((m) => m.id);
  const { data: skillRows } = memberIds.length
    ? await supabase
        .from("member_skills")
        .select("member_id, proficiency, skills(name)")
        .in("member_id", memberIds)
    : { data: [] };

  const skillsByMember = new Map<string, { name: string; proficiency: Proficiency }[]>();
  for (const row of skillRows ?? []) {
    const list = skillsByMember.get(row.member_id) ?? [];
    list.push({ name: row.skills?.name ?? "", proficiency: row.proficiency });
    skillsByMember.set(row.member_id, list);
  }

  const results = members ?? [];

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Member directory</h1>
      <p className="mt-2 text-muted-foreground">
        Looking for someone who knows a thing? Filter by skill and find them.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DirectoryFilters skills={allSkills ?? []} />
        </aside>

        <section>
          <p className="font-mono text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "member" : "members"}
          </p>

          {results.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed py-16 text-center">
              <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-4 font-heading text-lg font-semibold">Nobody matches that</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try dropping a filter, or lowering the level you asked for.
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2">
              {results.map((member) => {
                const skills = (skillsByMember.get(member.id) ?? []).sort((a, b) =>
                  a.name.localeCompare(b.name),
                );

                return (
                  <li key={member.id} className="rounded-2xl border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <MemberAvatar
                        id={member.id}
                        name={member.full_name}
                        className="size-11 border"
                      />

                      <div className="min-w-0 flex-1">
                        <h2 className="font-heading font-semibold leading-tight">
                          {member.full_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {roleLabel(member.designation, member.department)}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {member.branch ?? "—"}
                          {member.year ? ` · ${YEAR_LABEL[member.year]} year` : ""}
                        </p>
                      </div>

                      {member.open_to_invites && (
                        <Badge className="shrink-0 bg-acm-50 text-acm-700 hover:bg-acm-50 dark:bg-acm-900/50 dark:text-acm-200">
                          Available
                        </Badge>
                      )}
                    </div>

                    {member.bio && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {member.bio}
                      </p>
                    )}

                    {skills.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {skills.slice(0, 6).map((skill) => (
                          <li
                            key={skill.name}
                            className="rounded-full border px-2 py-0.5 font-mono text-xs"
                            title={skill.proficiency}
                          >
                            {skill.name}
                          </li>
                        ))}
                        {skills.length > 6 && (
                          <li className="px-1 py-0.5 font-mono text-xs text-muted-foreground">
                            +{skills.length - 6}
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
