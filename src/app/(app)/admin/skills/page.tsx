import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SkillModeration, type ModeratedSkill } from "@/components/admin/skill-moderation";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Skill tags" };

export default async function AdminSkillsPage() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: skills }, { data: usage }] = await Promise.all([
    supabase
      .from("skills")
      .select("id, name, category, is_custom")
      .eq("is_active", true)
      .order("is_custom", { ascending: false })
      .order("name"),
    supabase.from("member_skills").select("skill_id"),
  ]);

  const holders = new Map<string, number>();
  for (const row of usage ?? []) {
    holders.set(row.skill_id, (holders.get(row.skill_id) ?? 0) + 1);
  }

  const rows: ModeratedSkill[] = (skills ?? []).map((s) => ({
    ...s,
    holders: holders.get(s.id) ?? 0,
  }));

  const custom = rows.filter((s) => s.is_custom).length;

  return (
    <div>
      <PageHeader
        title="Skill tags"
        description={
          <>
            {rows.length} active tags
            {custom > 0 && `, ${custom} added by members`}. Member-added tags are listed
            first — they&apos;re where duplicates usually appear.
          </>
        }
      />

      <SkillModeration skills={rows} />
    </div>
  );
}
