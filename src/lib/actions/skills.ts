"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApproved, requireStaff } from "@/lib/auth";
import { PROFICIENCIES, type Proficiency } from "@/lib/constants";

export type SkillResult = { error?: string };

const MAX_TAG_LENGTH = 40;

/**
 * Attach a skill to the signed-in member.
 *
 * Takes either an existing tag id or a free-typed name. The free-typed path is
 * where duplicates creep into a tag list, so it resolves against the existing
 * slug first and only coins a new tag when nothing matches — and if the match
 * was already merged away ("JS" → "JavaScript"), it follows the redirect so the
 * member lands on the surviving tag.
 */
export async function addSkill(formData: FormData): Promise<SkillResult> {
  const profile = await requireApproved();
  const supabase = await createClient();

  const skillId = String(formData.get("skill_id") ?? "").trim();
  const customName = String(formData.get("custom_name") ?? "").trim();
  const proficiency = String(formData.get("proficiency") ?? "beginner") as Proficiency;

  if (!PROFICIENCIES.includes(proficiency)) return { error: "Pick a proficiency level." };

  let targetId = skillId || null;

  if (!targetId) {
    if (!customName) return { error: "Pick a skill or type a new one." };
    if (customName.length > MAX_TAG_LENGTH) {
      return { error: `Keep tag names under ${MAX_TAG_LENGTH} characters.` };
    }

    const { data: existing } = await supabase
      .from("skills")
      .select("id, is_active, merged_into_id")
      .eq("slug", customName.toLowerCase())
      .maybeSingle();

    if (existing) {
      if (existing.merged_into_id) {
        targetId = existing.merged_into_id;
      } else if (!existing.is_active) {
        return { error: "An admin retired that tag. Pick another one." };
      } else {
        targetId = existing.id;
      }
    } else {
      const { data: created, error } = await supabase
        .from("skills")
        .insert({
          name: customName,
          category: "Other",
          is_custom: true,
          created_by: profile.id,
        })
        .select("id")
        .single();

      if (error || !created) return { error: "That tag couldn't be created." };
      targetId = created.id;
    }
  }

  const { error } = await supabase
    .from("member_skills")
    .upsert({ member_id: profile.id, skill_id: targetId, proficiency });

  if (error) return { error: "That skill couldn't be saved." };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return {};
}

export async function removeSkill(formData: FormData): Promise<SkillResult> {
  const profile = await requireApproved();
  const skillId = String(formData.get("skill_id") ?? "");
  if (!skillId) return { error: "Missing skill." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("member_skills")
    .delete()
    .eq("member_id", profile.id)
    .eq("skill_id", skillId);

  if (error) return { error: "That skill couldn't be removed." };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return {};
}

/**
 * Fold a duplicate tag into the real one. Delegated to the merge_skills()
 * database function because it rewrites other members' rows — something no RLS
 * policy permits from the client, and rightly so.
 */
export async function mergeSkillTags(formData: FormData): Promise<SkillResult> {
  await requireStaff();

  const sourceId = String(formData.get("source_id") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  if (!sourceId || !targetId) return { error: "Pick both tags." };
  if (sourceId === targetId) return { error: "Pick two different tags." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_skills", {
    source_id: sourceId,
    target_id: targetId,
  });

  if (error) return { error: "Those tags couldn't be merged." };

  revalidatePath("/admin/skills");
  revalidatePath("/directory");
  return {};
}

/** Retire a tag without merging it — for typos nobody uses. */
export async function retireSkillTag(formData: FormData): Promise<SkillResult> {
  await requireStaff();

  const skillId = String(formData.get("skill_id") ?? "");
  if (!skillId) return { error: "Missing tag." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("skills")
    .update({ is_active: false })
    .eq("id", skillId);

  if (error) return { error: "That tag couldn't be retired." };

  revalidatePath("/admin/skills");
  revalidatePath("/directory");
  return {};
}
