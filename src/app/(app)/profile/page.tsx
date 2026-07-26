import type { Metadata } from "next";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { SkillEditor, type MemberSkill } from "@/components/skills/skill-editor";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const profile = await requireApproved();
  const supabase = await createClient();

  const [{ data: allSkills }, { data: mine }] = await Promise.all([
    supabase
      .from("skills")
      .select("id, name, category")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("member_skills")
      .select("skill_id, proficiency, skills(name)")
      .eq("member_id", profile.id),
  ]);

  const memberSkills: MemberSkill[] = (mine ?? [])
    .map((row) => ({
      skill_id: row.skill_id,
      proficiency: row.proficiency,
      name: row.skills?.name ?? "Unknown skill",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-2 text-muted-foreground">
          This is what other approved members see in the directory.
        </p>
        <div className="mt-8">
          <ProfileForm profile={profile} submitLabel="Save changes" />
        </div>
      </section>

      <section className="border-t pt-10">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Your skills</h2>
        <p className="mt-2 text-muted-foreground">
          Teams search by these. Saved as you go — no separate save button.
        </p>
        <div className="mt-6">
          <SkillEditor memberSkills={memberSkills} allSkills={allSkills ?? []} />
        </div>
      </section>
    </div>
  );
}
